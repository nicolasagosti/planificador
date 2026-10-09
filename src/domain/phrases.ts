// The sentences of the screens (docs/SPEC.md, section 5), with singular and
// plural. Texts the spec does not fix are listed in docs/DECISIONES.md.
// Headlines are segments, so the screen draws each number after the square
// of its status.
import { formatOnNetwork, pieceNoun } from "./catalog";
import {
  daysAgo,
  daysBetween,
  longDay,
  monthName,
  monthOf,
  monthOfYear,
  shortDate,
  shortDay,
  weekdayAndDay,
  type MonthKey,
} from "./dates";
import type { NotCounting, OverviewCalendar } from "./month-overview";
import {
  countPieces,
  firstNotDelivered,
  isOverdue,
  type Counts,
  type PieceState,
} from "./pieces";
import type { PieceProgress } from "./piece-transitions";
import type { CalendarStatus, PieceStatus } from "./statuses";
import { counted, joinWithAnd } from "./text";
import type { CalendarDay } from "./today";

// ---------------------------------------------------------------------------
// Headlines

export type Segment =
  | { kind: "text"; text: string }
  /** A number after the square of its status; `after` stays on its line. */
  | { kind: "figure"; status: PieceStatus; value: number; after: string };

const words = (value: string): Segment => ({ kind: "text", text: value });
const figure = (
  status: PieceStatus,
  value: number,
  after: string,
): Segment => ({ kind: "figure", status, value, after });

export function plainText(segments: readonly Segment[]): string {
  return segments
    .map((s) => (s.kind === "text" ? s.text : `${s.value}${s.after}`))
    .join("");
}

type Owed = Pick<Counts, "pending" | "done" | "delivered">;

function owedSentence(
  opening: string,
  deliveredVerb: string,
  counts: Owed,
): Segment[] {
  return [
    words(`${opening} `),
    figure(
      "pending",
      counts.pending,
      counts.pending === 1 ? " pieza" : " piezas",
    ),
    words(", tenés "),
    figure("done", counts.done, counts.done === 1 ? " hecha" : " hechas"),
    words(` sin entregar y ${deliveredVerb} `),
    figure("delivered", counts.delivered, "."),
  ];
}

const isUpToDate = (counts: Owed) =>
  counts.pending === 0 && counts.done === 0 && counts.delivered > 0;

function upToDate(verb: string, delivered: number, month: MonthKey) {
  const name = monthName(month);
  if (delivered === 1) {
    return [words(`Estás al día: ${verb} la única pieza de ${name}.`)];
  }
  return [
    words(`Estás al día: ${verb} las `),
    figure("delivered", delivered, " piezas"),
    words(` de ${name}.`),
  ];
}

/** Clientes: "Debés 25 piezas, tenés 9 hechas sin entregar y ya entregaste 13." */
export function monthHeadline(
  totals: Owed & { approvedCalendars: number },
  month: MonthKey,
): Segment[] {
  if (totals.approvedCalendars === 0) {
    return [
      words(`Todavía no tenés calendarios aprobados en ${monthName(month)}.`),
    ];
  }
  if (isUpToDate(totals)) {
    return upToDate("entregaste", totals.delivered, month);
  }
  return owedSentence("Debés", "ya entregaste", totals);
}

/** Calendario, approved: the same sentence for one calendar. */
export function calendarHeadline(counts: Owed, month: MonthKey): Segment[] {
  if (isUpToDate(counts)) {
    return upToDate("entregaste", counts.delivered, month);
  }
  return owedSentence("Debés", "ya entregaste", counts);
}

/** Cliente: "En octubre le debés 10 piezas, tenés 2 hechas sin entregar y ya le entregaste 3." */
export function clientHeadline(counts: Owed, month: MonthKey): Segment[] {
  if (isUpToDate(counts)) {
    return upToDate("le entregaste", counts.delivered, month);
  }
  return owedSentence(
    `En ${monthName(month)} le debés`,
    "ya le entregaste",
    counts,
  );
}

// ---------------------------------------------------------------------------
// Overdue

/** A sentence whose first part is emphasized. */
export type Emphasis = { lead: string; rest: string };

function overdueLead(count: number, end: ":" | "."): string {
  return count === 1
    ? `1 está atrasada${end}`
    : `${count} están atrasadas${end}`;
}

/** Clientes: "3 están atrasadas: 2 de Óptica Mirador y 1 de Café Lumbre." */
export function monthOverdueLine(
  byClient: readonly { name: string; overdue: number }[],
): Emphasis | null {
  const total = byClient.reduce((sum, entry) => sum + entry.overdue, 0);
  const [only] = byClient;
  if (total === 0 || !only) return null;
  if (byClient.length === 1) {
    return {
      lead: overdueLead(total, ":"),
      rest: ` ${total === 1 ? "es" : "son"} de ${only.name}.`,
    };
  }
  const parts = byClient.map((entry) => `${entry.overdue} de ${entry.name}`);
  return { lead: overdueLead(total, ":"), rest: ` ${joinWithAnd(parts)}.` };
}

/** Cliente: "1 está atrasada: el post de Facebook del viernes 2." or "3 están atrasadas." */
export function clientOverdueLine(
  pieces: readonly (PieceState & { format: string; network: string })[],
  today: CalendarDay,
): Emphasis | null {
  const overdue = pieces.filter((piece) => isOverdue(piece, today));
  const [only] = overdue;
  if (!only) return null;
  if (overdue.length > 1)
    return { lead: overdueLead(overdue.length, "."), rest: "" };
  return {
    lead: overdueLead(1, ":"),
    rest: ` ${pieceNoun(only.format, only.network)} del ${weekdayAndDay(only.date)}.`,
  };
}

/** Calendario, next to the squares: "1 está atrasada." or "Ninguna atrasada." */
export function calendarOverdueNote(overdue: number): {
  text: string;
  overdue: boolean;
} {
  if (overdue === 0) return { text: "Ninguna atrasada.", overdue: false };
  return { text: overdueLead(overdue, "."), overdue: true };
}

export const OVERDUE_ALERT =
  "Está atrasada: pasó la fecha y todavía no la entregaste.";

// ---------------------------------------------------------------------------
// Clientes

/**
 * "No cuentan todavía: 8 piezas de Estudio Pampa, que tiene el calendario
 * sin aprobar, y 6 de Impulso Funcional, que sigue en borrador."
 */
export function notCountingNote(groups: NotCounting): string | null {
  let first = true;
  const entry = ({ name, pieces }: { name: string; pieces: number }) => {
    const amount = first ? counted(pieces, "pieza", "piezas") : `${pieces}`;
    first = false;
    return `${amount} de ${name}`;
  };
  const parts: string[] = [];
  if (groups.sent.length > 0) {
    const verb =
      groups.sent.length === 1
        ? "que tiene el calendario sin aprobar"
        : "que tienen el calendario sin aprobar";
    parts.push(`${joinWithAnd(groups.sent.map(entry))}, ${verb}`);
  }
  if (groups.draft.length > 0) {
    const verb =
      groups.draft.length === 1
        ? "que sigue en borrador"
        : "que siguen en borrador";
    parts.push(`${joinWithAnd(groups.draft.map(entry))}, ${verb}`);
  }
  if (parts.length === 0) return null;
  return `No cuentan todavía: ${parts.join(", y ")}.`;
}

export type CalendarCell = {
  status: CalendarStatus | "none";
  label: string;
  detail: string | null;
};

/** Clientes, "Calendario de octubre" column. */
export function calendarCell(
  calendar: OverviewCalendar | null,
  today: CalendarDay,
): CalendarCell {
  if (!calendar)
    return { status: "none", label: "Sin calendario", detail: null };
  switch (calendar.status) {
    case "draft":
      return { status: "draft", label: "Borrador", detail: "sin enviar" };
    case "sent":
      return {
        status: "sent",
        label: "Enviado",
        detail: `${daysAgo(calendar.sentOn ?? today, today)}, sin respuesta`,
      };
    case "approved":
      return {
        status: "approved",
        label: "Aprobado",
        detail: calendar.approvedOn
          ? `el ${shortDate(calendar.approvedOn)}`
          : null,
      };
  }
}

/** "Crear calendario de octubre" */
export function createCalendarLabel(month: MonthKey): string {
  return `Crear calendario de ${monthName(month)}`;
}

export type NextDelivery =
  | { kind: "date"; date: string; note: string; overdue: boolean }
  | { kind: "note"; note: string }
  | { kind: "none" };

/** Clientes, "Próxima entrega" column. */
export function nextDeliveryCell(
  calendar: OverviewCalendar | null,
  today: CalendarDay,
): NextDelivery {
  if (!calendar) return { kind: "none" };
  if (calendar.status === "draft")
    return { kind: "note", note: "Cuando lo envíes" };
  if (calendar.status === "sent")
    return { kind: "note", note: "Cuando apruebe" };
  const next = firstNotDelivered(calendar.pieces);
  if (!next) return { kind: "note", note: "Todo entregado" };
  const { overdue } = countPieces(calendar.pieces, today);
  const note =
    overdue > 0
      ? counted(overdue, "atrasada", "atrasadas")
      : next.status === "done"
        ? "ya está hecha"
        : "falta hacerla";
  return {
    kind: "date",
    date: shortDay(next.date),
    note,
    overdue: overdue > 0,
  };
}

// ---------------------------------------------------------------------------
// Cliente

/** "Cafetería de especialidad. Cliente desde julio de 2026." */
export function clientSubtitle(client: {
  industry: string | null;
  clientSince: CalendarDay | null;
}): string | null {
  const parts: string[] = [];
  const industry = client.industry?.trim().replace(/\.+$/, "");
  if (industry) parts.push(`${industry}.`);
  if (client.clientSince) {
    parts.push(`Cliente desde ${monthOfYear(monthOf(client.clientSince))}.`);
  }
  return parts.length > 0 ? parts.join(" ") : null;
}

/** "Todavía no hay calendario de noviembre para Café Lumbre." */
export function missingCalendarText(
  clientName: string,
  month: MonthKey,
): string {
  return `Todavía no hay calendario de ${monthName(month)} para ${clientName}.`;
}

export type ClientMonthState =
  | { kind: "approved"; headline: Segment[] }
  | { kind: "missing" | "draft" | "sent"; text: string; actionLabel: string };

/**
 * Cliente, the sentence of the current month. When the calendar is not
 * approved it says its state and offers the next action.
 */
export function clientMonthState(
  clientName: string,
  month: MonthKey,
  calendar: OverviewCalendar | null,
  today: CalendarDay,
): ClientMonthState {
  const name = monthName(month);
  if (!calendar) {
    return {
      kind: "missing",
      text: missingCalendarText(clientName, month),
      actionLabel: createCalendarLabel(month),
    };
  }
  switch (calendar.status) {
    case "draft":
      return {
        kind: "draft",
        text: `El calendario de ${name} está en borrador: todavía no se lo mandaste.`,
        actionLabel: "Seguir armándolo",
      };
    case "sent":
      return {
        kind: "sent",
        text: `Le mandaste el calendario de ${name} el ${shortDate(calendar.sentOn ?? today)} y todavía no lo aprobó.`,
        actionLabel: "Marcar como aprobado",
      };
    case "approved":
      return {
        kind: "approved",
        headline: clientHeadline(countPieces(calendar.pieces, today), month),
      };
  }
}

/** Cliente, "Calendarios" table: "Aprobado el 28 sep, en curso". */
export function calendarRowStatus(
  calendar: Pick<OverviewCalendar, "status" | "sentOn" | "approvedOn">,
  month: MonthKey,
  today: CalendarDay,
): string {
  switch (calendar.status) {
    case "draft":
      return "Borrador, sin enviar";
    case "sent":
      return `Enviado el ${shortDate(calendar.sentOn ?? today)}, sin respuesta`;
    case "approved": {
      const current = monthOf(today) === month ? ", en curso" : "";
      return `Aprobado el ${shortDate(calendar.approvedOn ?? today)}${current}`;
    }
  }
}

/** Cliente, archived: replaces the sentence of the month. */
export function archivedNotice(archivedOn: CalendarDay | null): Emphasis {
  return {
    lead: archivedOn ? `Archivado el ${shortDate(archivedOn)}.` : "Archivado.",
    rest: "No aparece en Clientes y sus piezas no cuentan.",
  };
}

/** "Lo que sigue en octubre" */
export function upcomingTitle(month: MonthKey): string {
  return `Lo que sigue en ${monthName(month)}`;
}

/** "Abrir el calendario de octubre" */
export function openCalendarLabel(month: MonthKey): string {
  return `Abrir el calendario de ${monthName(month)}`;
}

/** Cliente, "Lo que sigue": the state of a piece in words. */
export function pieceStateLabel(
  piece: PieceState,
  today: CalendarDay,
): { text: string; square: PieceStatus | "overdue" } {
  if (isOverdue(piece, today)) return { text: "Atrasada", square: "overdue" };
  switch (piece.status) {
    case "pending":
      return { text: "Pendiente", square: "pending" };
    case "done":
      return { text: "Hecha, falta entregarla", square: "done" };
    case "delivered":
      return { text: "Entregada", square: "delivered" };
  }
}

// ---------------------------------------------------------------------------
// Calendario

/** The line under the month: "Aprobado el 28 sep. Las fechas y los temas…" */
export function calendarStatusLine(
  calendar: Pick<OverviewCalendar, "status" | "sentOn" | "approvedOn">,
  today: CalendarDay,
): Emphasis {
  switch (calendar.status) {
    case "draft":
      return { lead: "Borrador:", rest: "todavía no se lo mandaste." };
    case "sent": {
      const sentOn = calendar.sentOn ?? today;
      const days = daysBetween(sentOn, today);
      if (days <= 0) return { lead: "Enviado hoy.", rest: "" };
      if (days === 1) return { lead: "Enviado ayer.", rest: "" };
      return {
        lead: `Enviado el ${shortDate(sentOn)}, hace ${days} días.`,
        rest: "",
      };
    }
    case "approved":
      return {
        lead: `Aprobado el ${shortDate(calendar.approvedOn ?? today)}.`,
        rest: "Las fechas y los temas quedaron fijos: acá solo cambiás el estado de cada pieza.",
      };
  }
}

/** "Para el jueves 8 de octubre" */
export function dueLine(day: CalendarDay): string {
  return `Para el ${longDay(day)}`;
}

/** "Hoy es lunes 5 de octubre", in the top bar. */
export function todayLine(today: CalendarDay): string {
  return `Hoy es ${longDay(today)}`;
}

/** "Ir a septiembre de 2026", for the month arrows. */
export function goToMonthLabel(month: MonthKey): string {
  return `Ir a ${monthOfYear(month)}`;
}

/** "Pendiente", "Hecha", "Entregada" */
export const STATUS_NAMES: Record<PieceStatus, string> = {
  pending: "Pendiente",
  done: "Hecha",
  delivered: "Entregada",
};

/** Screen-reader name of a piece in the grid. */
export function pieceAriaLabel(
  piece: PieceState & { format: string; network: string; topic: string },
  calendarStatus: CalendarStatus,
  today: CalendarDay,
): string {
  const base = `${formatOnNetwork(piece.format, piece.network)}, ${weekdayAndDay(piece.date)}: ${piece.topic}.`;
  if (calendarStatus !== "approved") return base;
  const overdue = isOverdue(piece, today) ? ", atrasada." : ".";
  return `${base} ${STATUS_NAMES[piece.status]}${overdue}`;
}

export type PieceStep = {
  status: PieceStatus;
  label: string;
  reached: boolean;
  current: boolean;
  when: string;
};

/** The panel's three steps, each with its day. */
export function pieceSteps(
  piece: PieceProgress,
  approvedOn: CalendarDay,
  today: CalendarDay,
): PieceStep[] {
  const on = (day: CalendarDay) =>
    day === today ? "hoy" : `el ${shortDate(day)}`;
  return [
    {
      status: "pending",
      label: STATUS_NAMES.pending,
      reached: true,
      current: piece.status === "pending",
      when: `desde que aprobó, ${on(approvedOn)}`,
    },
    {
      status: "done",
      label: STATUS_NAMES.done,
      reached: piece.status !== "pending",
      current: piece.status === "done",
      when: piece.doneOn ? on(piece.doneOn) : "todavía no",
    },
    {
      status: "delivered",
      label: STATUS_NAMES.delivered,
      reached: piece.status === "delivered",
      current: piece.status === "delivered",
      when: piece.deliveredOn ? on(piece.deliveredOn) : "todavía no",
    },
  ];
}

/** The file of a piece: its name (or the link's site) and the button text. */
export function assetLink(
  url: string,
  name: string | null,
): { label: string; openLabel: "Abrir en Drive" | "Abrir archivo" } {
  let host = url;
  try {
    host = new URL(url).hostname;
  } catch {
    // Keep the raw text: only valid http(s) links are ever stored.
  }
  const drive = host === "drive.google.com" || host === "docs.google.com";
  return {
    label: name?.trim() || host,
    openLabel: drive ? "Abrir en Drive" : "Abrir archivo",
  };
}

// ---------------------------------------------------------------------------
// Squares

/** Screen-reader description of a row of squares. */
export function squaresDescription(
  calendarStatus: CalendarStatus,
  pieces: readonly PieceState[],
  today: CalendarDay,
): string {
  const total = pieces.length;
  if (total === 0) return "Sin piezas";
  if (calendarStatus === "sent") {
    return total === 1
      ? "1 pieza planificada que todavía no cuenta"
      : `${total} piezas planificadas que todavía no cuentan`;
  }
  if (calendarStatus === "draft") {
    return total === 1
      ? "1 pieza cargada en borrador"
      : `${total} piezas cargadas en borrador`;
  }
  const counts = countPieces(pieces, today);
  const pieceWord = counted(total, "pieza", "piezas");
  if (counts.delivered === total) {
    return `${pieceWord}, ${total === 1 ? "entregada" : "todas entregadas"}`;
  }
  const parts: string[] = [];
  if (counts.delivered > 0)
    parts.push(counted(counts.delivered, "entregada", "entregadas"));
  if (counts.done > 0) parts.push(counted(counts.done, "hecha", "hechas"));
  if (counts.pending > 0)
    parts.push(counted(counts.pending, "pendiente", "pendientes"));
  const overdue =
    counts.overdue > 0
      ? `, ${counts.overdue} de ellas ${counts.overdue === 1 ? "atrasada" : "atrasadas"}`
      : "";
  return `${pieceWord}: ${joinWithAnd(parts)}${overdue}`;
}

/** The legend under the grid. */
export const SQUARE_LEGEND = {
  pending: "Pendiente",
  done: "Hecha, falta entregarla",
  delivered: "Entregada",
  overdue: "Atrasada: pasó la fecha y no la entregaste",
} as const;
