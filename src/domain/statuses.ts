// Calendar and piece states (docs/SPEC.md, section 3). "Overdue" is not a
// state: it is computed from the date and never stored.

export const CALENDAR_STATUSES = ["draft", "sent", "approved"] as const;
export type CalendarStatus = (typeof CALENDAR_STATUSES)[number];

export const PIECE_STATUSES = ["pending", "done", "delivered"] as const;
export type PieceStatus = (typeof PIECE_STATUSES)[number];

export const CALENDAR_EVENT_TYPES = [
  "sent",
  "approved",
  "reopened",
  "back_to_draft",
] as const;
export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];
