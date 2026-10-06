import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CalendarHeading } from "@/components/calendar/calendar-heading";
import {
  CalendarStatusLine,
  CalendarSummary,
} from "@/components/calendar/calendar-status";
import { primaryButton } from "@/components/ui/buttons";
import { loadCalendar } from "@/db/queries/calendars";
import { findClientOr404 } from "@/db/queries/clients";
import { monthTitle, type MonthKey } from "@/domain/dates";
import { isSupportedMonth } from "@/domain/month-overview";
import { missingCalendarText } from "@/domain/phrases";
import { requireUser } from "@/server/session";
import { today } from "@/server/today";
import { createCalendar } from "../actions";

type Props = PageProps<"/clientes/[clientId]/calendarios/[month]">;

async function load(params: Props["params"]) {
  const { clientId, month } = await params;
  if (!isSupportedMonth(month)) notFound();
  const client = await findClientOr404(clientId);
  return { client, month };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { client, month } = await load(params);
  return { title: `${monthTitle(month)} · ${client.name} · Planificador` };
}

// The month's header for now: the grid and the panel of pieces come with the
// next phases.
export default async function CalendarPage({ params }: Props) {
  await requireUser();
  const { client, month } = await load(params);
  const calendar = await loadCalendar(client.id, month);
  const day = today();
  const hrefFor = (target: MonthKey) =>
    `/clientes/${client.id}/calendarios/${target}` as Route;

  return (
    <main className="mx-auto max-w-page px-8 pt-3 pb-18">
      <Breadcrumbs
        items={[
          { label: "Clientes", href: "/" },
          { label: client.name, href: `/clientes/${client.id}` as Route },
          { label: monthTitle(month) },
        ]}
      />
      <CalendarHeading month={month} hrefFor={hrefFor} />

      {calendar ? (
        <>
          <CalendarStatusLine calendar={calendar} day={day} />
          {calendar.status === "approved" && (
            <CalendarSummary calendar={calendar} month={month} day={day} />
          )}
        </>
      ) : (
        <div className="mt-7 flex flex-col items-start gap-4">
          <p className="max-w-summary text-summary leading-[1.25] font-medium font-stretch-106% tracking-[-0.01em] text-balance">
            {missingCalendarText(client.name, month)}
          </p>
          {/* An archived client gets no new calendars. */}
          {client.archivedOn === null && (
            <form action={createCalendar.bind(null, client.id)}>
              <input type="hidden" name="month" value={month} />
              <button type="submit" className={primaryButton}>
                Crear calendario
              </button>
            </form>
          )}
        </div>
      )}
    </main>
  );
}
