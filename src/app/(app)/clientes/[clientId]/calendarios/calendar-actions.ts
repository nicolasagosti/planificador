"use server";

import { and, asc, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Tx } from "@/db/connection";
import {
  calendarEvents,
  calendars,
  clients,
  pieces,
  type PieceSnapshot,
} from "@/db/schema";
import {
  CALENDAR_PERMISSIONS,
  CALENDAR_REFUSAL_MESSAGES,
  planCalendarTransition,
} from "@/domain/calendar-transitions";
import { idSchema } from "@/domain/schemas";
import { getDb } from "@/server/db";
import { requireUser } from "@/server/session";
import { timestampValue } from "@/server/timestamps";

export type CalendarResult = { ok: true } | { ok: false; message: string };

const NOT_FOUND = "No encontramos ese calendario. Recargá la página.";

const actionSchema = z.enum(["send", "approve", "backToDraft", "reopen"]);

/** The calendar, locked for this transaction, if it belongs to the user. */
async function lockedCalendar(tx: Tx, calendarId: string, userId: string) {
  const [row] = await tx
    .select({
      id: calendars.id,
      status: calendars.status,
      month: calendars.month,
      clientId: clients.id,
    })
    .from(calendars)
    .innerJoin(clients, eq(clients.id, calendars.clientId))
    .where(and(eq(calendars.id, calendarId), eq(clients.userId, userId)))
    .for("update", { of: calendars });
  return row;
}

function revalidateCalendar(clientId: string, month: string) {
  revalidatePath("/");
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath(`/clientes/${clientId}/calendarios/${month.slice(0, 7)}`);
}

/**
 * Sends, approves, takes back to draft or reopens a calendar
 * (docs/SPEC.md, section 3). Each transition records its event; approving
 * also keeps a copy of the pieces as the client approved them.
 */
export async function transitionCalendar(
  calendarId: string,
  action: string,
): Promise<CalendarResult> {
  const user = await requireUser();
  const id = idSchema.safeParse(calendarId);
  const parsedAction = actionSchema.safeParse(action);
  if (!id.success || !parsedAction.success) {
    return { ok: false, message: NOT_FOUND };
  }

  const result = await getDb().transaction(
    async (
      tx,
    ): Promise<CalendarResult & { clientId?: string; month?: string }> => {
      const calendar = await lockedCalendar(tx, id.data, user.id);
      if (!calendar) return { ok: false, message: NOT_FOUND };
      const [pieceCount] = await tx
        .select({ value: count() })
        .from(pieces)
        .where(eq(pieces.calendarId, calendar.id));
      const plan = planCalendarTransition(parsedAction.data, {
        status: calendar.status,
        pieceCount: pieceCount?.value ?? 0,
      });
      if (!plan.ok) {
        return { ok: false, message: CALENDAR_REFUSAL_MESSAGES[plan.reason] };
      }
      const { transition } = plan;

      let snapshot: PieceSnapshot[] | null = null;
      if (transition.snapshot) {
        snapshot = await tx
          .select({
            id: pieces.id,
            date: pieces.date,
            network: pieces.network,
            format: pieces.format,
            topic: pieces.topic,
            idea: pieces.idea,
            status: pieces.status,
          })
          .from(pieces)
          .where(eq(pieces.calendarId, calendar.id))
          .orderBy(asc(pieces.date), asc(pieces.createdAt), asc(pieces.id));
      }

      await tx
        .update(calendars)
        .set({
          status: transition.to,
          sentAt: timestampValue(transition.sentAt),
          approvedAt: timestampValue(transition.approvedAt),
        })
        .where(eq(calendars.id, calendar.id));
      await tx.insert(calendarEvents).values({
        calendarId: calendar.id,
        type: transition.event,
        snapshot,
      });
      return { ok: true, clientId: calendar.clientId, month: calendar.month };
    },
  );

  if (!result.ok) return result;
  if (result.clientId && result.month) {
    revalidateCalendar(result.clientId, result.month);
  }
  return { ok: true };
}

/**
 * Deletes a draft calendar with its pieces and its history, including the
 * record of an earlier approval if it was reopened (docs/DECISIONES.md).
 */
export async function deleteCalendar(
  calendarId: string,
): Promise<CalendarResult> {
  const user = await requireUser();
  const id = idSchema.safeParse(calendarId);
  if (!id.success) return { ok: false, message: NOT_FOUND };

  const result = await getDb().transaction(
    async (
      tx,
    ): Promise<CalendarResult & { clientId?: string; month?: string }> => {
      const calendar = await lockedCalendar(tx, id.data, user.id);
      if (!calendar) return { ok: false, message: NOT_FOUND };
      if (!CALENDAR_PERMISSIONS[calendar.status].deleteCalendar) {
        return {
          ok: false,
          message: CALENDAR_REFUSAL_MESSAGES["wrong-status"],
        };
      }
      // Pieces and events go with it (on delete cascade).
      await tx.delete(calendars).where(eq(calendars.id, calendar.id));
      return { ok: true, clientId: calendar.clientId, month: calendar.month };
    },
  );

  if (!result.ok) return result;
  if (result.clientId && result.month) {
    revalidateCalendar(result.clientId, result.month);
  }
  return { ok: true };
}

/**
 * "Marcar como aprobado" on the Cliente screen, a form without a place for
 * messages: if the server refuses, the page shows the calendar as it is.
 */
export async function approveCalendar(calendarId: string): Promise<void> {
  await transitionCalendar(calendarId, "approve");
}
