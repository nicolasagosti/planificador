"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Tx } from "@/db/connection";
import { calendars, clients, pieces } from "@/db/schema";
import { CALENDAR_PERMISSIONS } from "@/domain/calendar-transitions";
import {
  PIECE_REFUSAL_MESSAGES,
  planPieceMove,
} from "@/domain/piece-transitions";
import { assetInputSchema, idSchema, pieceInputSchema } from "@/domain/schemas";
import { PIECE_STATUSES } from "@/domain/statuses";
import { getDb } from "@/server/db";
import { requireUser } from "@/server/session";
import { timestampValue } from "@/server/timestamps";

export type PieceResult = { ok: true } | { ok: false; message: string };

const NOT_FOUND = "No encontramos esa pieza. Recargá la página.";

const statusSchema = z.enum(PIECE_STATUSES);

/** The piece, locked for this transaction, if it belongs to the user. */
async function lockedPiece(tx: Tx, pieceId: string, userId: string) {
  const [row] = await tx
    .select({
      status: pieces.status,
      calendarStatus: calendars.status,
      clientId: clients.id,
      month: calendars.month,
    })
    .from(pieces)
    .innerJoin(calendars, eq(calendars.id, pieces.calendarId))
    .innerJoin(clients, eq(clients.id, calendars.clientId))
    .where(and(eq(pieces.id, pieceId), eq(clients.userId, userId)))
    .for("update", { of: pieces });
  return row;
}

function revalidateCalendar(clientId: string, month: string) {
  revalidatePath("/");
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath(`/clientes/${clientId}/calendarios/${month.slice(0, 7)}`);
}

/**
 * Moves a piece one step, forward or back, in an approved calendar
 * (docs/SPEC.md, section 3). `from` is the state the screen showed: if the
 * piece changed meanwhile, nothing happens.
 */
export async function movePiece(
  pieceId: string,
  from: string,
  to: string,
): Promise<PieceResult> {
  const user = await requireUser();
  const id = idSchema.safeParse(pieceId);
  const fromStatus = statusSchema.safeParse(from);
  const toStatus = statusSchema.safeParse(to);
  if (!id.success || !fromStatus.success || !toStatus.success) {
    return { ok: false, message: NOT_FOUND };
  }

  const result = await getDb().transaction(
    async (
      tx,
    ): Promise<PieceResult & { clientId?: string; month?: string }> => {
      const piece = await lockedPiece(tx, id.data, user.id);
      if (!piece) return { ok: false, message: NOT_FOUND };
      if (piece.status !== fromStatus.data) {
        return { ok: false, message: PIECE_REFUSAL_MESSAGES["not-one-step"] };
      }
      const plan = planPieceMove({
        calendarStatus: piece.calendarStatus,
        from: fromStatus.data,
        to: toStatus.data,
      });
      if (!plan.ok) {
        return { ok: false, message: PIECE_REFUSAL_MESSAGES[plan.reason] };
      }
      await tx
        .update(pieces)
        .set({
          status: plan.move.to,
          doneAt: timestampValue(plan.move.doneAt),
          deliveredAt: timestampValue(plan.move.deliveredAt),
        })
        .where(eq(pieces.id, id.data));
      return { ok: true, clientId: piece.clientId, month: piece.month };
    },
  );

  if (!result.ok) return result;
  if (result.clientId && result.month) {
    revalidateCalendar(result.clientId, result.month);
  }
  return { ok: true };
}

export type AssetField = "url" | "name";

export type AssetResult =
  | { ok: true }
  | { ok: false; message: string }
  | { ok: false; errors: Partial<Record<AssetField, string>> };

/**
 * Saves the file link of a piece, and its optional name. An empty link
 * removes both. Only in approved calendars, whatever the piece's state
 * (docs/DECISIONES.md).
 */
export async function updatePieceAsset(
  pieceId: string,
  input: { url: string; name: string },
): Promise<AssetResult> {
  const user = await requireUser();
  const id = idSchema.safeParse(pieceId);
  if (!id.success) return { ok: false, message: NOT_FOUND };
  const parsed = assetInputSchema.safeParse(input);
  if (!parsed.success) {
    const errors: Partial<Record<AssetField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if ((field === "url" || field === "name") && !errors[field]) {
        errors[field] = issue.message;
      }
    }
    return { ok: false, errors };
  }

  const result = await getDb().transaction(
    async (
      tx,
    ): Promise<PieceResult & { clientId?: string; month?: string }> => {
      const piece = await lockedPiece(tx, id.data, user.id);
      if (!piece) return { ok: false, message: NOT_FOUND };
      if (!CALENDAR_PERMISSIONS[piece.calendarStatus].editAssetLink) {
        return {
          ok: false,
          message:
            "El link del archivo se carga solo en un calendario aprobado.",
        };
      }
      await tx
        .update(pieces)
        .set({ assetUrl: parsed.data.url, assetName: parsed.data.name })
        .where(eq(pieces.id, id.data));
      return { ok: true, clientId: piece.clientId, month: piece.month };
    },
  );

  if (!result.ok) return result;
  if (result.clientId && result.month) {
    revalidateCalendar(result.clientId, result.month);
  }
  return { ok: true };
}

export type PieceField = "date" | "network" | "format" | "topic" | "idea";

export type SavePieceResult =
  | { ok: true; id: string }
  | { ok: false; message: string }
  | { ok: false; errors: Partial<Record<PieceField, string>> };

const PIECE_FIELDS: readonly PieceField[] = [
  "date",
  "network",
  "format",
  "topic",
  "idea",
];

const NOT_EDITABLE =
  "Las piezas se cargan y se cambian solo en un calendario en borrador.";

/**
 * Creates a piece in a draft calendar (`pieceId` null) or changes one of
 * its pieces. The date has to fall inside the calendar's month.
 */
export async function savePiece(
  calendarId: string,
  pieceId: string | null,
  input: Record<PieceField, string>,
): Promise<SavePieceResult> {
  const user = await requireUser();
  const calendar = idSchema.safeParse(calendarId);
  const piece = pieceId === null ? null : idSchema.safeParse(pieceId);
  if (!calendar.success || (piece && !piece.success)) {
    return { ok: false, message: NOT_FOUND };
  }

  const result = await getDb().transaction(
    async (
      tx,
    ): Promise<SavePieceResult & { clientId?: string; month?: string }> => {
      const [row] = await tx
        .select({
          status: calendars.status,
          month: calendars.month,
          clientId: clients.id,
        })
        .from(calendars)
        .innerJoin(clients, eq(clients.id, calendars.clientId))
        .where(
          and(eq(calendars.id, calendar.data), eq(clients.userId, user.id)),
        )
        .for("update", { of: calendars });
      if (!row) return { ok: false, message: NOT_FOUND };
      if (!CALENDAR_PERMISSIONS[row.status].editPieces) {
        return { ok: false, message: NOT_EDITABLE };
      }

      const parsed = pieceInputSchema(row.month.slice(0, 7)).safeParse(input);
      if (!parsed.success) {
        const errors: Partial<Record<PieceField, string>> = {};
        for (const issue of parsed.error.issues) {
          const field = PIECE_FIELDS.find((name) => name === issue.path[0]);
          if (field && !errors[field]) errors[field] = issue.message;
        }
        return { ok: false, errors };
      }

      if (piece) {
        const updated = await tx
          .update(pieces)
          .set(parsed.data)
          .where(
            and(
              eq(pieces.id, piece.data),
              eq(pieces.calendarId, calendar.data),
            ),
          )
          .returning({ id: pieces.id });
        if (updated.length === 0) return { ok: false, message: NOT_FOUND };
        return {
          ok: true,
          id: piece.data,
          clientId: row.clientId,
          month: row.month,
        };
      }
      const [created] = await tx
        .insert(pieces)
        .values({ ...parsed.data, calendarId: calendar.data })
        .returning({ id: pieces.id });
      if (!created) return { ok: false, message: NOT_FOUND };
      return {
        ok: true,
        id: created.id,
        clientId: row.clientId,
        month: row.month,
      };
    },
  );

  if (!result.ok) return result;
  if (result.clientId && result.month) {
    revalidateCalendar(result.clientId, result.month);
  }
  return { ok: true, id: result.id };
}

/** Deletes a piece of a draft calendar. */
export async function deletePiece(pieceId: string): Promise<PieceResult> {
  const user = await requireUser();
  const id = idSchema.safeParse(pieceId);
  if (!id.success) return { ok: false, message: NOT_FOUND };

  const result = await getDb().transaction(
    async (
      tx,
    ): Promise<PieceResult & { clientId?: string; month?: string }> => {
      const piece = await lockedPiece(tx, id.data, user.id);
      if (!piece) return { ok: false, message: NOT_FOUND };
      if (!CALENDAR_PERMISSIONS[piece.calendarStatus].editPieces) {
        return { ok: false, message: NOT_EDITABLE };
      }
      await tx.delete(pieces).where(eq(pieces.id, id.data));
      return { ok: true, clientId: piece.clientId, month: piece.month };
    },
  );

  if (!result.ok) return result;
  if (result.clientId && result.month) {
    revalidateCalendar(result.clientId, result.month);
  }
  return { ok: true };
}
