// Pieces: overdue, counts and the row of squares (docs/SPEC.md, section 3).
// Only pieces of approved calendars count; callers pass those.
import type { CalendarStatus, PieceStatus } from "./statuses";
import type { CalendarDay } from "./today";

/** The part of a piece the rules look at. */
export type PieceState = { date: CalendarDay; status: PieceStatus };

/** Not delivered and its day is before today. Computed, never stored. */
export function isOverdue(piece: PieceState, today: CalendarDay): boolean {
  return piece.status !== "delivered" && piece.date < today;
}

export type Counts = {
  total: number;
  pending: number;
  done: number;
  delivered: number;
  /** Already counted in `pending` or `done`: not a fourth group. */
  overdue: number;
};

export function countPieces(
  pieces: readonly PieceState[],
  today: CalendarDay,
): Counts {
  const counts: Counts = {
    total: pieces.length,
    pending: 0,
    done: 0,
    delivered: 0,
    overdue: 0,
  };
  for (const piece of pieces) {
    counts[piece.status] += 1;
    if (isOverdue(piece, today)) counts.overdue += 1;
  }
  return counts;
}

/** Calendar order: by day; pieces of the same day keep the order given. */
export function byDate<T extends PieceState>(pieces: readonly T[]): T[] {
  return [...pieces].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
}

/** The first piece not delivered yet, overdue ones included. */
export function firstNotDelivered<T extends PieceState>(
  pieces: readonly T[],
): T | undefined {
  return byDate(pieces).find((piece) => piece.status !== "delivered");
}

/** What comes next: the first `limit` pieces not delivered, by day. */
export function upcoming<T extends PieceState>(
  pieces: readonly T[],
  limit = 5,
): T[] {
  return byDate(pieces)
    .filter((piece) => piece.status !== "delivered")
    .slice(0, limit);
}

/**
 * How a piece is drawn in a row of squares: its state in an approved
 * calendar, or hollow while it does not count yet (solid border when the
 * calendar was sent, dashed while it is a draft).
 */
export type Square = PieceStatus | "overdue" | "sent" | "draft";

export function squareFor(
  calendarStatus: CalendarStatus,
  piece: PieceState,
  today: CalendarDay,
): Square {
  if (calendarStatus === "draft") return "draft";
  if (calendarStatus === "sent") return "sent";
  return isOverdue(piece, today) ? "overdue" : piece.status;
}

/** One square per piece, by day. */
export function squares(
  calendarStatus: CalendarStatus,
  pieces: readonly PieceState[],
  today: CalendarDay,
): Square[] {
  return byDate(pieces).map((piece) => squareFor(calendarStatus, piece, today));
}
