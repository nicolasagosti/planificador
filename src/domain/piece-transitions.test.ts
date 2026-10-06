import { describe, expect, it } from "vitest";
import {
  applyPieceMove,
  pieceActions,
  planPieceMove,
  type PieceMove,
  type PieceProgress,
} from "./piece-transitions";
import type { PieceStatus } from "./statuses";

const TODAY = "2026-10-05";

function move(from: PieceStatus, to: PieceStatus): PieceMove {
  const result = planPieceMove({ calendarStatus: "approved", from, to });
  if (!result.ok) throw new Error(result.reason);
  return result.move;
}

describe("valid piece moves", () => {
  it("moves one step forward or back, with its timestamps", () => {
    expect(move("pending", "done")).toMatchObject({
      doneAt: "now",
      deliveredAt: "keep",
    });
    expect(move("done", "delivered")).toMatchObject({
      doneAt: "keep",
      deliveredAt: "now",
    });
    expect(move("delivered", "done")).toMatchObject({
      doneAt: "keep",
      deliveredAt: "clear",
    });
    expect(move("done", "pending")).toMatchObject({
      doneAt: "clear",
      deliveredAt: "keep",
    });
  });
});

describe("invalid piece moves", () => {
  it.each([
    ["pending", "delivered"],
    ["delivered", "pending"],
    ["pending", "pending"],
    ["delivered", "delivered"],
  ] as const)("refuses %s → %s", (from, to) => {
    expect(planPieceMove({ calendarStatus: "approved", from, to })).toEqual({
      ok: false,
      reason: "not-one-step",
    });
  });

  it.each(["draft", "sent"] as const)(
    "refuses any move while the calendar is %s",
    (calendarStatus) => {
      expect(
        planPieceMove({ calendarStatus, from: "pending", to: "done" }),
      ).toEqual({
        ok: false,
        reason: "calendar-not-approved",
      });
    },
  );
});

describe("applyPieceMove", () => {
  const pending: PieceProgress = {
    status: "pending",
    doneOn: null,
    deliveredOn: null,
  };

  it("sets and clears the days of each step", () => {
    const done = applyPieceMove(pending, move("pending", "done"), TODAY);
    expect(done).toEqual({ status: "done", doneOn: TODAY, deliveredOn: null });

    const delivered = applyPieceMove(
      { ...done, doneOn: "2026-10-02" },
      move("done", "delivered"),
      TODAY,
    );
    expect(delivered).toEqual({
      status: "delivered",
      doneOn: "2026-10-02",
      deliveredOn: TODAY,
    });

    const backToDone = applyPieceMove(
      delivered,
      move("delivered", "done"),
      TODAY,
    );
    expect(backToDone).toEqual({
      status: "done",
      doneOn: "2026-10-02",
      deliveredOn: null,
    });

    const backToPending = applyPieceMove(
      backToDone,
      move("done", "pending"),
      TODAY,
    );
    expect(backToPending).toEqual(pending);
  });

  it("keeps the other fields of the piece", () => {
    const piece = { ...pending, id: "p1", topic: "Promo" };
    expect(applyPieceMove(piece, move("pending", "done"), TODAY)).toMatchObject(
      {
        id: "p1",
        topic: "Promo",
      },
    );
  });
});

describe("pieceActions", () => {
  it("offers the next step and the way back", () => {
    expect(pieceActions("pending")).toEqual({
      forward: { to: "done", label: "Marcar como hecha" },
      back: null,
      finished: null,
    });
    expect(pieceActions("done")).toEqual({
      forward: { to: "delivered", label: "Marcar como entregada" },
      back: { to: "pending", label: "Volver a pendiente" },
      finished: null,
    });
    expect(pieceActions("delivered")).toEqual({
      forward: null,
      back: { to: "done", label: "Volver a hecha" },
      finished: "Lista. No queda nada por hacer con esta pieza.",
    });
  });
});
