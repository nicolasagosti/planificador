import type { Metadata, Route } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import {
  ClientCalendarsTable,
  type CalendarRow,
} from "@/components/clients/client-calendars-table";
import { ClientDataPanel } from "@/components/clients/client-data-panel";
import { NewCalendarDialog } from "@/components/clients/new-calendar-dialog";
import {
  UpcomingTable,
  type UpcomingRow,
} from "@/components/clients/upcoming-table";
import { HeadlineText } from "@/components/status/headline-text";
import { linkButton, secondaryButton } from "@/components/ui/buttons";
import {
  loadClientCalendars,
  type ClientCalendar,
} from "@/db/queries/calendars";
import { findClientOr404 } from "@/db/queries/clients";
import { formatOnNetwork } from "@/domain/catalog";
import { monthOf, monthTitle, shortDay, type MonthKey } from "@/domain/dates";
import { newCalendarMonths, proposedNewMonth } from "@/domain/month-overview";
import {
  archivedNotice,
  calendarRowStatus,
  clientMonthState,
  clientOverdueLine,
  clientSubtitle,
  openCalendarLabel,
  pieceStateLabel,
  squaresDescription,
  upcomingTitle,
} from "@/domain/phrases";
import { countPieces, squares, upcoming } from "@/domain/pieces";
import type { CalendarDay } from "@/domain/today";
import { requireUser } from "@/server/session";
import { today } from "@/server/today";
import { unarchiveClient } from "../actions";
import { createCalendar } from "./calendarios/actions";
import { approveCalendar } from "./calendarios/calendar-actions";

export async function generateMetadata({
  params,
}: PageProps<"/clientes/[clientId]">): Promise<Metadata> {
  const client = await findClientOr404((await params).clientId);
  return { title: `${client.name} · Planificador` };
}

const summaryClass =
  "mt-7 max-w-summary text-summary leading-[1.25] font-medium font-stretch-106% tracking-[-0.01em] text-balance";

export default async function ClientPage({
  params,
}: PageProps<"/clientes/[clientId]">) {
  await requireUser();
  const client = await findClientOr404((await params).clientId);
  const day = today();
  const currentMonth = monthOf(day);
  const calendars = await loadClientCalendars(client.id);
  const current = calendars.find((c) => c.month === currentMonth) ?? null;
  const subtitle = clientSubtitle(client);
  const calendarHref = (month: MonthKey) =>
    `/clientes/${client.id}/calendarios/${month}` as Route;
  const createCalendarAction = createCalendar.bind(null, client.id);

  const rows: CalendarRow[] = calendars.map((calendar) => {
    const counts =
      calendar.status === "approved" ? countPieces(calendar.pieces, day) : null;
    return {
      href: calendarHref(calendar.month),
      title: monthTitle(calendar.month),
      status: calendar.status,
      statusText: calendarRowStatus(calendar, calendar.month, day),
      numbers: counts ? [counts.pending, counts.done, counts.delivered] : null,
      squares: squares(calendar.status, calendar.pieces, day),
      squaresLabel: squaresDescription(calendar.status, calendar.pieces, day),
    };
  });

  const archivedOn = client.archivedOn;
  const archived = archivedOn !== null;
  const existing = calendars.map((c) => c.month);
  // An archived client's pieces do not count: nothing is owed to it, and it
  // gets no new calendars until it is unarchived.
  const upcomingRows: UpcomingRow[] =
    !archived && current?.status === "approved"
      ? upcoming(current.pieces).map((piece) => ({
          id: piece.id,
          date: shortDay(piece.date),
          what: formatOnNetwork(piece.format, piece.network),
          topic: piece.topic,
          state: pieceStateLabel(piece, day),
        }))
      : [];

  return (
    <main className="mx-auto max-w-page px-8 pt-3 pb-18">
      <Breadcrumbs
        items={[{ label: "Clientes", href: "/" }, { label: client.name }]}
      />
      <h1 className="mt-2 text-title leading-[1.1] font-bold font-stretch-112% tracking-[-0.02em]">
        {client.name}
      </h1>
      {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}

      {archived ? (
        <Archived clientId={client.id} archivedOn={archivedOn} />
      ) : (
        <CurrentMonth
          clientName={client.name}
          month={currentMonth}
          calendar={current}
          day={day}
          href={calendarHref(currentMonth)}
          createAction={createCalendarAction}
          approveAction={
            current ? approveCalendar.bind(null, current.id) : undefined
          }
        />
      )}

      <div className="mt-11 flex flex-wrap items-start gap-x-14 gap-y-12">
        <div className="min-w-0 flex-[999_1_600px]">
          <section aria-labelledby="calendarios">
            {/* As tall as the button, so it lines up with the client's data
                when an archived client has no "Nuevo calendario". */}
            <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-6 gap-y-2">
              <h2
                id="calendarios"
                className="text-22 font-bold font-stretch-108% tracking-[-0.01em]"
              >
                Calendarios
              </h2>
              {!archived && (
                <NewCalendarDialog
                  action={createCalendarAction}
                  months={newCalendarMonths(existing, currentMonth).map(
                    (month) => ({
                      value: month,
                      label: monthTitle(month),
                    }),
                  )}
                  proposed={proposedNewMonth(existing, currentMonth)}
                />
              )}
            </div>
            {rows.length > 0 ? (
              <ClientCalendarsTable rows={rows} />
            ) : (
              <p className="mt-2.5 border-t-[1.5px] border-ink pt-4 text-muted">
                Todavía no armaste calendarios para este cliente.
              </p>
            )}
          </section>

          {upcomingRows.length > 0 && (
            <section aria-labelledby="lo-que-sigue" className="mt-12">
              <h2
                id="lo-que-sigue"
                className="text-22 font-bold font-stretch-108% tracking-[-0.01em]"
              >
                {upcomingTitle(currentMonth)}
              </h2>
              <UpcomingTable rows={upcomingRows} labelledBy="lo-que-sigue" />
              <Link
                href={calendarHref(currentMonth)}
                className={`${linkButton} mt-1.5`}
              >
                {openCalendarLabel(currentMonth)}
              </Link>
            </section>
          )}
        </div>

        <ClientDataPanel
          client={client}
          currentYear={Number(day.slice(0, 4))}
        />
      </div>
    </main>
  );
}

/**
 * The sentence of the current month. When its calendar is not approved it
 * says its state and offers the next action.
 */
function CurrentMonth({
  clientName,
  month,
  calendar,
  day,
  href,
  createAction,
  approveAction,
}: {
  clientName: string;
  month: MonthKey;
  calendar: ClientCalendar | null;
  day: CalendarDay;
  href: Route;
  createAction: (formData: FormData) => Promise<void>;
  approveAction: (() => Promise<void>) | undefined;
}) {
  const state = clientMonthState(clientName, month, calendar, day);

  if (state.kind === "approved") {
    const overdue = clientOverdueLine(calendar?.pieces ?? [], day);
    return (
      <>
        <p className={summaryClass}>
          <HeadlineText segments={state.headline} />
        </p>
        {overdue && (
          <p className="mt-3 text-16">
            <span
              aria-hidden="true"
              className="mr-3 mb-px ml-[3px] inline-block size-[11px] rotate-45 rounded-square-sm bg-overdue"
            />
            <strong className="font-bold text-overdue-text">
              {overdue.lead}
            </strong>
            {overdue.rest}
          </p>
        )}
      </>
    );
  }

  return (
    <>
      <p className={summaryClass}>{state.text}</p>
      <div className="mt-4">
        {state.kind === "missing" ? (
          <form action={createAction}>
            <input type="hidden" name="month" value={month} />
            <button type="submit" className={secondaryButton}>
              {state.actionLabel}
            </button>
          </form>
        ) : state.kind === "sent" && approveAction ? (
          <form action={approveAction}>
            <button type="submit" className={secondaryButton}>
              {state.actionLabel}
            </button>
          </form>
        ) : (
          <Link href={href} className={secondaryButton}>
            {state.actionLabel}
          </Link>
        )}
      </div>
    </>
  );
}

function Archived({
  clientId,
  archivedOn,
}: {
  clientId: string;
  archivedOn: CalendarDay;
}) {
  const notice = archivedNotice(archivedOn);
  return (
    <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2">
      <p className="text-18">
        <strong className="font-bold">{notice.lead}</strong>{" "}
        <span className="text-muted">{notice.rest}</span>
      </p>
      <form action={unarchiveClient.bind(null, clientId)}>
        <button type="submit" className={secondaryButton}>
          Desarchivar
        </button>
      </form>
    </div>
  );
}
