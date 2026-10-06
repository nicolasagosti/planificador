// Piece states move one step at a time, forward or back, and only while the
// calendar is approved (docs/SPEC.md, section 3).
import type { TimestampChange } from "./calendar-transitions";
import type { CalendarStatus, PieceStatus } from "./statuses";
import type { CalendarDay } from "./today";

export type PieceMove = {
  from: PieceStatus;
  to: PieceStatus;
  doneAt: TimestampChange;
  deliveredAt: TimestampChange;
};

const MOVES: readonly PieceMove[] = [
  { from: "pending", to: "done", doneAt: "now", deliveredAt: "keep" },
  { from: "done", to: "delivered", doneAt: "keep", deliveredAt: "now" },
  { from: "delivered", to: "done", doneAt: "keep", deliveredAt: "clear" },
  { from: "done", to: "pending", doneAt: "clear", deliveredAt: "keep" },
];

export type PieceRefusal = "calendar-not-approved" | "not-one-step";

export function planPieceMove(input: {
  calendarStatus: CalendarStatus;
  from: PieceStatus;
  to: PieceStatus;
}): { ok: true; move: PieceMove } | { ok: false; reason: PieceRefusal } {
  if (input.calendarStatus !== "approved") {
    return { ok: false, reason: "calendar-not-approved" };
  }
  const move = MOVES.find((m) => m.from === input.from && m.to === input.to);
  if (!move) return { ok: false, reason: "not-one-step" };
  return { ok: true, move };
}

export const PIECE_REFUSAL_MESSAGES: Record<PieceRefusal, string> = {
  "calendar-not-approved":
    "El estado de las piezas cambia solo en un calendario aprobado.",
  "not-one-step":
    "La pieza cambió mientras tanto. Recargá la página y probá de nuevo.",
};

/** The days a piece was done and delivered, as the panel shows them. */
export type PieceProgress = {
  status: PieceStatus;
  doneOn: CalendarDay | null;
  deliveredOn: CalendarDay | null;
};

/** The piece after a move, with `today` for the moments set to now. */
export function applyPieceMove<T extends PieceProgress>(
  piece: T,
  move: PieceMove,
  today: CalendarDay,
): T {
  const change = (current: CalendarDay | null, how: TimestampChange) =>
    how === "now" ? today : how === "clear" ? null : current;
  return {
    ...piece,
    status: move.to,
    doneOn: change(piece.doneOn, move.doneAt),
    deliveredOn: change(piece.deliveredOn, move.deliveredAt),
  };
}

export type PieceActions = {
  /** The main button. */
  forward: { to: PieceStatus; label: string } | null;
  /** The link under it. */
  back: { to: PieceStatus; label: string } | null;
  /** Shown instead of the main button once delivered. */
  finished: string | null;
};

export function pieceActions(status: PieceStatus): PieceActions {
  switch (status) {
    case "pending":
      return {
        forward: { to: "done", label: "Marcar como hecha" },
        back: null,
        finished: null,
      };
    case "done":
      return {
        forward: { to: "delivered", label: "Marcar como entregada" },
        back: { to: "pending", label: "Volver a pendiente" },
        finished: null,
      };
    case "delivered":
      return {
        forward: null,
        back: { to: "done", label: "Volver a hecha" },
        finished: "Lista. No queda nada por hacer con esta pieza.",
      };
  }
}
