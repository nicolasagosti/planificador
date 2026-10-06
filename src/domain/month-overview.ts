// One month across clients: totals, filters and the order of the Clientes
// screen (docs/SPEC.md, sections 3 and 5).
import { addMonths, isMonthKey, type MonthKey } from "./dates";
import { countPieces, type Counts, type PieceState } from "./pieces";
import type { CalendarStatus } from "./statuses";
import type { CalendarDay } from "./today";

export type OverviewCalendar = {
  status: CalendarStatus;
  /** Days in the app's time zone. */
  sentOn: CalendarDay | null;
  approvedOn: CalendarDay | null;
  pieces: readonly PieceState[];
};

export type ClientOverview = {
  id: string;
  name: string;
  archived: boolean;
  /** The client's calendar for the month, if there is one. */
  calendar: OverviewCalendar | null;
};

/** Counts of an approved calendar; null when it does not count yet. */
export function countsOf(
  calendar: OverviewCalendar | null,
  today: CalendarDay,
): Counts | null {
  if (calendar?.status !== "approved") return null;
  return countPieces(calendar.pieces, today);
}

export type MonthTotals = {
  /** Approved calendars that count (clients not archived). */
  approvedCalendars: number;
  pending: number;
  done: number;
  delivered: number;
  overdue: number;
};

/** Only pieces of approved calendars of clients not archived count. */
export function monthTotals(
  clients: readonly ClientOverview[],
  today: CalendarDay,
): MonthTotals {
  const totals: MonthTotals = {
    approvedCalendars: 0,
    pending: 0,
    done: 0,
    delivered: 0,
    overdue: 0,
  };
  for (const client of clients) {
    if (client.archived) continue;
    const counts = countsOf(client.calendar, today);
    if (!counts) continue;
    totals.approvedCalendars += 1;
    totals.pending += counts.pending;
    totals.done += counts.done;
    totals.delivered += counts.delivered;
    totals.overdue += counts.overdue;
  }
  return totals;
}

// ---------------------------------------------------------------------------
// Order: the most urgent first

const collator = new Intl.Collator("es", {
  sensitivity: "base",
  numeric: true,
});

/**
 * 1. More overdue pieces. 2. More pending. 3. More done, not delivered.
 * 4. Sent, the one waiting longest first. 5. Draft. 6. No calendar.
 * 7. Approved with everything delivered: nothing to do this month
 * (docs/DECISIONES.md). Ties go by name.
 */
function urgency(client: ClientOverview, today: CalendarDay): number[] {
  const calendar = client.calendar;
  if (!calendar) return [3];
  if (calendar.status === "draft") return [2];
  if (calendar.status === "sent") {
    // Earlier day, longer wait: "YYYYMMDD" ascending.
    const sentOn = calendar.sentOn ?? today;
    return [1, Number(sentOn.replaceAll("-", ""))];
  }
  const counts = countPieces(calendar.pieces, today);
  if (counts.pending + counts.done === 0) return [4];
  return [0, -counts.overdue, -counts.pending, -counts.done];
}

function compareKeys(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const difference = (a[i] ?? 0) - (b[i] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export function sortByUrgency<T extends ClientOverview>(
  clients: readonly T[],
  today: CalendarDay,
): T[] {
  return [...clients].sort(
    (a, b) =>
      compareKeys(urgency(a, today), urgency(b, today)) ||
      collator.compare(a.name, b.name),
  );
}

// ---------------------------------------------------------------------------
// Filters

export const CLIENT_FILTERS = ["all", "overdue", "awaiting", "draft"] as const;
export type ClientFilter = (typeof CLIENT_FILTERS)[number];

export const CLIENT_FILTER_LABELS: Record<ClientFilter, string> = {
  all: "Todos",
  overdue: "Con atrasos",
  awaiting: "Esperando aprobación",
  draft: "En borrador",
};

/** What the table says when a filter leaves no client. */
export const CLIENT_FILTER_EMPTY: Record<ClientFilter, string> = {
  all: "No hay clientes.",
  overdue: "Ningún cliente tiene piezas atrasadas.",
  awaiting: "Ningún calendario está esperando aprobación.",
  draft: "Ningún calendario está en borrador.",
};

export function matchesFilter(
  client: ClientOverview,
  filter: ClientFilter,
  today: CalendarDay,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "overdue":
      return (countsOf(client.calendar, today)?.overdue ?? 0) > 0;
    case "awaiting":
      return client.calendar?.status === "sent";
    case "draft":
      return client.calendar?.status === "draft";
  }
}

export function filterCounts(
  clients: readonly ClientOverview[],
  today: CalendarDay,
): Record<ClientFilter, number> {
  const count = (filter: ClientFilter) =>
    clients.filter((client) => matchesFilter(client, filter, today)).length;
  return {
    all: count("all"),
    overdue: count("overdue"),
    awaiting: count("awaiting"),
    draft: count("draft"),
  };
}

// ---------------------------------------------------------------------------
// Inputs of the Clientes sentences

/** Overdue pieces per client, in the order given (the urgency order). */
export function overdueByClient(
  clients: readonly ClientOverview[],
  today: CalendarDay,
): { name: string; overdue: number }[] {
  return clients
    .filter((client) => !client.archived)
    .map((client) => ({
      name: client.name,
      overdue: countsOf(client.calendar, today)?.overdue ?? 0,
    }))
    .filter((entry) => entry.overdue > 0);
}

export type NotCounting = {
  /** Sent and waiting, the one waiting longest first. */
  sent: { name: string; pieces: number }[];
  /** Drafts, by name. */
  draft: { name: string; pieces: number }[];
};

/** Calendars with pieces that do not count yet. Empty ones are left out. */
export function notCounting(clients: readonly ClientOverview[]): NotCounting {
  const withPieces = clients.filter(
    (client) => !client.archived && (client.calendar?.pieces.length ?? 0) > 0,
  );
  const sent = withPieces
    .filter((client) => client.calendar?.status === "sent")
    .sort(
      (a, b) =>
        (a.calendar?.sentOn ?? "").localeCompare(b.calendar?.sentOn ?? "") ||
        collator.compare(a.name, b.name),
    );
  const draft = withPieces
    .filter((client) => client.calendar?.status === "draft")
    .sort((a, b) => collator.compare(a.name, b.name));
  const entry = (client: ClientOverview) => ({
    name: client.name,
    pieces: client.calendar?.pieces.length ?? 0,
  });
  return { sent: sent.map(entry), draft: draft.map(entry) };
}

// ---------------------------------------------------------------------------
// Months

/** The month of `?mes=YYYY-MM`, or the fallback when it is not valid. */
export function parseMonthParam(value: unknown, fallback: MonthKey): MonthKey {
  if (typeof value !== "string" || !isMonthKey(value)) return fallback;
  const year = Number(value.slice(0, 4));
  return year >= 2000 && year <= 2100 ? value : fallback;
}

/** "Nuevo calendario" proposes the first month without one, from this one. */
export function proposedNewMonth(
  existing: readonly MonthKey[],
  currentMonth: MonthKey,
): MonthKey {
  let month = currentMonth;
  while (existing.includes(month)) month = addMonths(month, 1);
  return month;
}
