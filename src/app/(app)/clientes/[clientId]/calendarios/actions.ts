"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import {
  calendarEvents,
  calendars,
  clients,
  pieces,
  type PieceSnapshot,
} from "@/db/schema";
import {
  CALENDAR_REFUSAL_MESSAGES,
  planCalendarImport,
  type TimestampChange,
} from "@/domain/calendar-transitions";
import { firstDayOf } from "@/domain/dates";
import { isSupportedMonth } from "@/domain/month-overview";
import { calendarImportSchema, idSchema } from "@/domain/schemas";
import { getDb } from "@/server/db";
import { requireUser } from "@/server/session";

/**
 * Creates the client's calendar of the month in the form (a draft) and
 * opens it. If that month already has one, it just opens it. Archived
 * clients get no new calendars.
 */
export async function createCalendar(
  clientId: string,
  formData: FormData,
): Promise<void> {
  const user = await requireUser();
  const id = idSchema.safeParse(clientId);
  const month = formData.get("month");
  if (!id.success || !isSupportedMonth(month)) notFound();

  const db = getDb();
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(
        eq(clients.id, id.data),
        eq(clients.userId, user.id),
        isNull(clients.archivedAt),
      ),
    );
  if (!client) notFound();

  await db
    .insert(calendars)
    .values({ clientId: client.id, month: firstDayOf(month) })
    .onConflictDoNothing({ target: [calendars.clientId, calendars.month] });

  revalidatePath("/");
  revalidatePath(`/clientes/${client.id}`);
  redirect(`/clientes/${client.id}/calendarios/${month}` as Route);
}

export type ImportResult = { ok: true } | { ok: false; message: string };

/** The value a transition gives a timestamp column, if it changes it. */
function timestampValue(change: TimestampChange) {
  if (change === "now") return sql`now()`;
  if (change === "clear") return null;
  return undefined;
}

/**
 * Loads the pieces read from an Excel or HTML file into the client's
 * calendar of `month`: it creates the calendar if the month has none and
 * replaces the pieces of a draft. With `approved`, the client already
 * approved it outside the app, and the calendar goes on to sent and approved.
 * The file's states are kept; the moments they record are now.
 */
export async function importCalendar(
  clientId: string,
  month: string,
  input: unknown,
): Promise<ImportResult> {
  const user = await requireUser();
  const id = idSchema.safeParse(clientId);
  if (!id.success || !isSupportedMonth(month)) {
    return { ok: false, message: "No encontramos ese calendario." };
  }
  const parsed = calendarImportSchema(month).safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        "No pudimos leer las piezas. Elegí el archivo de nuevo.",
    };
  }
  const { approved, pieces: imported } = parsed.data;

  const result = await getDb().transaction(
    async (tx): Promise<ImportResult> => {
      const [client] = await tx
        .select({ id: clients.id, archivedAt: clients.archivedAt })
        .from(clients)
        .where(and(eq(clients.id, id.data), eq(clients.userId, user.id)));
      if (!client) return { ok: false, message: "No encontramos ese cliente." };
      // Archived clients get no new calendars (docs/DECISIONES.md).
      if (client.archivedAt) {
        return {
          ok: false,
          message:
            "El cliente está archivado: desarchivalo para importarle un calendario.",
        };
      }

      await tx
        .insert(calendars)
        .values({ clientId: client.id, month: firstDayOf(month) })
        .onConflictDoNothing({
          target: [calendars.clientId, calendars.month],
        });
      const [calendar] = await tx
        .select({ id: calendars.id, status: calendars.status })
        .from(calendars)
        .where(
          and(
            eq(calendars.clientId, client.id),
            eq(calendars.month, firstDayOf(month)),
          ),
        )
        .for("update");
      if (!calendar) {
        return { ok: false, message: "No pudimos crear el calendario." };
      }
      const plan = planCalendarImport({
        calendarStatus: calendar.status,
        approved,
      });
      if (!plan.ok) {
        return { ok: false, message: CALENDAR_REFUSAL_MESSAGES[plan.reason] };
      }

      await tx.delete(pieces).where(eq(pieces.calendarId, calendar.id));
      const inserted: PieceSnapshot[] = await tx
        .insert(pieces)
        .values(
          imported.map((piece) => ({
            calendarId: calendar.id,
            date: piece.date,
            network: piece.network,
            format: piece.format,
            topic: piece.topic,
            idea: piece.idea,
            status: piece.status,
            doneAt: piece.status === "pending" ? null : sql`now()`,
            deliveredAt: piece.status === "delivered" ? sql`now()` : null,
          })),
        )
        .returning({
          id: pieces.id,
          date: pieces.date,
          network: pieces.network,
          format: pieces.format,
          topic: pieces.topic,
          idea: pieces.idea,
          status: pieces.status,
        });

      for (const transition of plan.transitions) {
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
          snapshot: transition.snapshot ? inserted : null,
        });
      }
      return { ok: true };
    },
  );

  if (result.ok) {
    revalidatePath("/");
    revalidatePath(`/clientes/${id.data}`);
    revalidatePath(`/clientes/${id.data}/calendarios/${month}`);
  }
  return result;
}
