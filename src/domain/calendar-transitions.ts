// Calendar states and their transitions (docs/SPEC.md, section 3). The server
// validates every transition with planCalendarTransition before writing.
import type { CalendarEventType, CalendarStatus } from "./statuses";

export type CalendarAction = "send" | "approve" | "backToDraft" | "reopen";

/** What a transition does to a timestamp column. */
export type TimestampChange = "now" | "clear" | "keep";

export type CalendarTransition = {
  action: CalendarAction;
  from: CalendarStatus;
  to: CalendarStatus;
  event: CalendarEventType;
  sentAt: TimestampChange;
  approvedAt: TimestampChange;
  /** Approving keeps a copy of the pieces as the client approved them. */
  snapshot: boolean;
  /** Reopening asks for confirmation first. */
  confirm: boolean;
};

const TRANSITIONS: Record<CalendarAction, CalendarTransition> = {
  send: {
    action: "send",
    from: "draft",
    to: "sent",
    event: "sent",
    sentAt: "now",
    approvedAt: "keep",
    snapshot: false,
    confirm: false,
  },
  approve: {
    action: "approve",
    from: "sent",
    to: "approved",
    event: "approved",
    sentAt: "keep",
    approvedAt: "now",
    snapshot: true,
    confirm: false,
  },
  // Back to draft clears both dates; the history stays in calendar_events.
  backToDraft: {
    action: "backToDraft",
    from: "sent",
    to: "draft",
    event: "back_to_draft",
    sentAt: "clear",
    approvedAt: "clear",
    snapshot: false,
    confirm: false,
  },
  reopen: {
    action: "reopen",
    from: "approved",
    to: "draft",
    event: "reopened",
    sentAt: "clear",
    approvedAt: "clear",
    snapshot: false,
    confirm: true,
  },
};

export type CalendarRefusal = "wrong-status" | "no-pieces";

export function planCalendarTransition(
  action: CalendarAction,
  calendar: { status: CalendarStatus; pieceCount: number },
):
  | { ok: true; transition: CalendarTransition }
  | { ok: false; reason: CalendarRefusal } {
  const transition = TRANSITIONS[action];
  if (calendar.status !== transition.from) {
    return { ok: false, reason: "wrong-status" };
  }
  if (action === "send" && calendar.pieceCount === 0) {
    return { ok: false, reason: "no-pieces" };
  }
  return { ok: true, transition };
}

/** The transitions that start from a state. */
export function calendarActionsFrom(status: CalendarStatus): CalendarAction[] {
  return Object.values(TRANSITIONS)
    .filter((transition) => transition.from === status)
    .map((transition) => transition.action);
}

export const CALENDAR_REFUSAL_MESSAGES: Record<CalendarRefusal, string> = {
  "wrong-status":
    "El calendario cambió de estado mientras tanto. Recargá la página.",
  "no-pieces": "Agregá al menos una pieza para poder enviarlo.",
};

export type CalendarPermissions = {
  /** Add, edit and delete pieces: date, network, format, topic, idea. */
  editPieces: boolean;
  changePieceStatus: boolean;
  editAssetLink: boolean;
  deleteCalendar: boolean;
  export: boolean;
};

// An approved calendar locks the date, network, format, topic and idea of its
// pieces. The file link is edited only in approved calendars
// (docs/DECISIONES.md).
export const CALENDAR_PERMISSIONS: Record<CalendarStatus, CalendarPermissions> =
  {
    draft: {
      editPieces: true,
      changePieceStatus: false,
      editAssetLink: false,
      deleteCalendar: true,
      export: true,
    },
    sent: {
      editPieces: false,
      changePieceStatus: false,
      editAssetLink: false,
      deleteCalendar: false,
      export: true,
    },
    approved: {
      editPieces: false,
      changePieceStatus: true,
      editAssetLink: true,
      deleteCalendar: false,
      export: true,
    },
  };
