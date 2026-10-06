import { describe, expect, it } from "vitest";
import {
  byDate,
  countPieces,
  firstNotDelivered,
  isOverdue,
  squares,
  upcoming,
  type PieceState,
} from "./pieces";
import { calendarDayIn } from "./today";

const TODAY = "2026-10-05";

describe("isOverdue", () => {
  it("is a piece not delivered whose day is before today", () => {
    expect(isOverdue({ date: "2026-10-04", status: "pending" }, TODAY)).toBe(
      true,
    );
    expect(isOverdue({ date: "2026-10-04", status: "done" }, TODAY)).toBe(true);
    expect(isOverdue({ date: "2026-10-01", status: "delivered" }, TODAY)).toBe(
      false,
    );
  });

  it("does not count today's piece as overdue", () => {
    expect(isOverdue({ date: TODAY, status: "pending" }, TODAY)).toBe(false);
  });

  it("follows the app's time zone, not UTC", () => {
    const piece: PieceState = { date: "2026-10-04", status: "pending" };
    const buenosAires = "America/Argentina/Buenos_Aires";
    // 02:30 UTC on the 5th is still the 4th in Buenos Aires.
    const lateOnThe4th = calendarDayIn(
      new Date("2026-10-05T02:30:00Z"),
      buenosAires,
    );
    const startOfThe5th = calendarDayIn(
      new Date("2026-10-05T03:00:00Z"),
      buenosAires,
    );
    expect(isOverdue(piece, lateOnThe4th)).toBe(false);
    expect(isOverdue(piece, startOfThe5th)).toBe(true);
  });
});

describe("countPieces", () => {
  it("counts by state; overdue pieces are part of pending or done", () => {
    const pieces: PieceState[] = [
      { date: "2026-10-01", status: "delivered" },
      { date: "2026-10-02", status: "pending" },
      { date: "2026-10-03", status: "done" },
      { date: "2026-10-08", status: "done" },
      { date: "2026-10-10", status: "pending" },
    ];
    expect(countPieces(pieces, TODAY)).toEqual({
      total: 5,
      pending: 2,
      done: 2,
      delivered: 1,
      overdue: 2,
    });
  });

  it("counts nothing for no pieces", () => {
    expect(countPieces([], TODAY)).toEqual({
      total: 0,
      pending: 0,
      done: 0,
      delivered: 0,
      overdue: 0,
    });
  });
});

describe("order and next pieces", () => {
  const pieces = [
    { id: "c", date: "2026-10-10", status: "pending" as const },
    { id: "a", date: "2026-10-02", status: "pending" as const },
    { id: "b", date: "2026-10-01", status: "delivered" as const },
    { id: "d", date: "2026-10-10", status: "done" as const },
  ];

  it("sorts by day and keeps the order of pieces on the same day", () => {
    expect(byDate(pieces).map((p) => p.id)).toEqual(["b", "a", "c", "d"]);
  });

  it("finds the first piece not delivered, even if overdue", () => {
    expect(firstNotDelivered(pieces)?.id).toBe("a");
    expect(
      firstNotDelivered([{ date: TODAY, status: "delivered" }]),
    ).toBeUndefined();
  });

  it("lists what comes next without delivered pieces", () => {
    expect(upcoming(pieces).map((p) => p.id)).toEqual(["a", "c", "d"]);
    expect(upcoming(pieces, 2).map((p) => p.id)).toEqual(["a", "c"]);
  });
});

describe("squares", () => {
  const pieces: PieceState[] = [
    { date: "2026-10-08", status: "done" },
    { date: "2026-10-01", status: "delivered" },
    { date: "2026-10-02", status: "pending" },
    { date: "2026-10-10", status: "pending" },
  ];

  it("draws an approved calendar by state, overdue as its own shape", () => {
    expect(squares("approved", pieces, TODAY)).toEqual([
      "delivered",
      "overdue",
      "done",
      "pending",
    ]);
  });

  it("draws hollow squares while the calendar does not count", () => {
    expect(squares("sent", pieces, TODAY)).toEqual(Array(4).fill("sent"));
    expect(squares("draft", pieces, TODAY)).toEqual(Array(4).fill("draft"));
  });
});
