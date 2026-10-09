import { describe, expect, it } from "vitest";
import {
  CALENDAR_PERMISSIONS,
  calendarActionsFrom,
  planCalendarImport,
  planCalendarTransition,
  type CalendarAction,
} from "./calendar-transitions";
import type { CalendarStatus } from "./statuses";

const plan = (action: CalendarAction, status: CalendarStatus, pieceCount = 3) =>
  planCalendarTransition(action, { status, pieceCount });

describe("valid calendar transitions", () => {
  it("sends a draft with pieces and records when", () => {
    const result = plan("send", "draft");
    expect(result).toMatchObject({
      ok: true,
      transition: {
        to: "sent",
        event: "sent",
        sentAt: "now",
        approvedAt: "keep",
      },
    });
  });

  it("approves a sent calendar, records when and keeps a copy of the pieces", () => {
    expect(plan("approve", "sent")).toMatchObject({
      ok: true,
      transition: {
        to: "approved",
        event: "approved",
        approvedAt: "now",
        snapshot: true,
      },
    });
  });

  it("takes a sent calendar back to draft and clears its dates", () => {
    expect(plan("backToDraft", "sent")).toMatchObject({
      ok: true,
      transition: {
        to: "draft",
        event: "back_to_draft",
        sentAt: "clear",
        approvedAt: "clear",
      },
    });
  });

  it("reopens an approved calendar after confirmation", () => {
    expect(plan("reopen", "approved")).toMatchObject({
      ok: true,
      transition: {
        to: "draft",
        event: "reopened",
        sentAt: "clear",
        approvedAt: "clear",
        confirm: true,
      },
    });
  });
});

describe("invalid calendar transitions", () => {
  it.each([
    ["send", "sent"],
    ["send", "approved"],
    ["approve", "draft"],
    ["approve", "approved"],
    ["backToDraft", "draft"],
    ["backToDraft", "approved"],
    ["reopen", "draft"],
    ["reopen", "sent"],
  ] as const)("refuses %s from %s", (action, status) => {
    expect(plan(action, status)).toEqual({ ok: false, reason: "wrong-status" });
  });

  it("refuses to send a calendar without pieces", () => {
    expect(plan("send", "draft", 0)).toEqual({
      ok: false,
      reason: "no-pieces",
    });
  });
});

describe("what each state allows", () => {
  it("offers the transitions that start from it", () => {
    expect(calendarActionsFrom("draft")).toEqual(["send"]);
    expect(calendarActionsFrom("sent")).toEqual(["approve", "backToDraft"]);
    expect(calendarActionsFrom("approved")).toEqual(["reopen"]);
  });

  it("locks the content of pieces outside drafts", () => {
    expect(CALENDAR_PERMISSIONS.draft.editPieces).toBe(true);
    expect(CALENDAR_PERMISSIONS.sent.editPieces).toBe(false);
    expect(CALENDAR_PERMISSIONS.approved.editPieces).toBe(false);
  });

  it("changes piece states and file links only when approved", () => {
    expect(CALENDAR_PERMISSIONS.approved.changePieceStatus).toBe(true);
    expect(CALENDAR_PERMISSIONS.approved.editAssetLink).toBe(true);
    expect(CALENDAR_PERMISSIONS.draft.changePieceStatus).toBe(false);
    expect(CALENDAR_PERMISSIONS.sent.editAssetLink).toBe(false);
  });

  it("deletes only drafts and exports in every state", () => {
    expect(CALENDAR_PERMISSIONS.draft.deleteCalendar).toBe(true);
    expect(CALENDAR_PERMISSIONS.sent.deleteCalendar).toBe(false);
    expect(CALENDAR_PERMISSIONS.approved.deleteCalendar).toBe(false);
    expect(Object.values(CALENDAR_PERMISSIONS).every((p) => p.export)).toBe(
      true,
    );
  });
});

describe("importing a file", () => {
  it("fills a month without calendar or a draft", () => {
    expect(
      planCalendarImport({ calendarStatus: null, approved: false }),
    ).toEqual({ ok: true, transitions: [] });
    expect(
      planCalendarImport({ calendarStatus: "draft", approved: false }),
    ).toEqual({ ok: true, transitions: [] });
  });

  it("goes through sent and approved when the client already approved", () => {
    const plan = planCalendarImport({ calendarStatus: null, approved: true });
    expect(
      plan.ok && plan.transitions.map((transition) => transition.event),
    ).toEqual(["sent", "approved"]);
    expect(
      plan.ok && plan.transitions.map((transition) => transition.snapshot),
    ).toEqual([false, true]);
  });

  it("never touches a calendar that was sent or approved", () => {
    for (const calendarStatus of ["sent", "approved"] as const) {
      for (const approved of [false, true]) {
        expect(planCalendarImport({ calendarStatus, approved })).toEqual({
          ok: false,
          reason: "wrong-status",
        });
      }
    }
    expect(CALENDAR_PERMISSIONS.draft.importFile).toBe(true);
  });
});
