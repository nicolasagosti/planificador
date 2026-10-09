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
import { assetInputSchema, idSchema } from "@/domain/schemas";
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
