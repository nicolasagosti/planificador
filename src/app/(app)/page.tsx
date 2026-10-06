import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import {
  ClientsTable,
  type ClientRow,
} from "@/components/clients/clients-table";
import { MonthNav } from "@/components/clients/month-nav";
import { HeadlineText } from "@/components/status/headline-text";
import { loadMonthOverview } from "@/db/queries/clients";
import { monthName, monthOf } from "@/domain/dates";
import {
  countsOf,
  filterCounts,
  matchesFilter,
  monthTotals,
  notCounting,
  overdueByClient,
  parseMonthParam,
  sortByUrgency,
} from "@/domain/month-overview";
import {
  calendarCell,
  monthHeadline,
  monthOverdueLine,
  nextDeliveryCell,
  notCountingNote,
  squaresDescription,
} from "@/domain/phrases";
import { squares } from "@/domain/pieces";
import { requireUser } from "@/server/session";
import { today } from "@/server/today";
import { createClient } from "./clientes/actions";

export const metadata: Metadata = { title: "Clientes · Planificador" };

export default async function ClientsPage({ searchParams }: PageProps<"/">) {
  await requireUser();
  const { mes } = await searchParams;
  const day = today();
  const month = parseMonthParam(mes, monthOf(day));
  const clients = sortByUrgency(await loadMonthOverview(month), day);

  const overdue = monthOverdueLine(overdueByClient(clients, day));
  const note = notCountingNote(notCounting(clients));
  const name = monthName(month);

  const rows: ClientRow[] = clients.map((client) => {
    const counts = countsOf(client.calendar, day);
    const calendar = client.calendar;
    return {
      id: client.id,
      name: client.name,
      industry: client.industry,
      cell: calendarCell(calendar, day),
      numbers: counts ? [counts.pending, counts.done, counts.delivered] : null,
      squares: calendar ? squares(calendar.status, calendar.pieces, day) : [],
      squaresLabel: calendar
        ? squaresDescription(calendar.status, calendar.pieces, day)
        : "Sin calendario",
      next: nextDeliveryCell(calendar, day),
      filters: {
        overdue: matchesFilter(client, "overdue", day),
        awaiting: matchesFilter(client, "awaiting", day),
        draft: matchesFilter(client, "draft", day),
      },
    };
  });

  const newClient = (
    <ClientFormDialog
      mode="create"
      action={createClient}
      currentYear={Number(day.slice(0, 4))}
    />
  );

  return (
    <main className="mx-auto max-w-page px-8 pt-6 pb-18">
      <MonthNav month={month} />

      <h1 className="mt-2.5 max-w-headline text-headline leading-[1.2] font-medium font-stretch-108% tracking-[-0.015em] text-balance">
        <HeadlineText
          segments={monthHeadline(monthTotals(clients, day), month)}
          edge="thick"
        />
      </h1>

      {overdue && (
        <p className="mt-5 max-w-line text-18">
          <span
            aria-hidden="true"
            className="mr-[13px] mb-px ml-1 inline-block size-3 rotate-45 rounded-square-sm bg-overdue"
          />
          <strong className="font-bold text-overdue-text">
            {overdue.lead}
          </strong>
          {overdue.rest}
        </p>
      )}

      {note && (
        <p className="mt-2 max-w-line text-muted">
          <span
            aria-hidden="true"
            className="mr-[13px] -mb-px ml-[3px] inline-block size-[13px] rounded-square shadow-[inset_0_0_0_1.5px_var(--color-hollow)]"
          />
          {note}
        </p>
      )}

      {clients.length === 0 ? (
        <NoClientsYet newClient={newClient} />
      ) : (
        <>
          <ClientsTable
            rows={rows}
            counts={filterCounts(clients, day)}
            monthName={name}
            monthTitleName={`${name.charAt(0).toUpperCase()}${name.slice(1)}`}
            newClient={newClient}
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-13 text-muted">
            <span>
              Ordenados por urgencia: primero los que tienen piezas atrasadas.
            </span>
            <Link
              href="/clientes/archivados"
              className="flex min-h-11 items-center font-semibold text-ink underline underline-offset-3"
            >
              Ver clientes archivados
            </Link>
          </div>
        </>
      )}
    </main>
  );
}

/** With no clients yet: an invitation to create the first one, not an empty table. */
function NoClientsYet({ newClient }: { newClient: ReactNode }) {
  return (
    <section
      aria-labelledby="sin-clientes"
      className="mt-11 max-w-line border-t-[1.5px] border-ink pt-6"
    >
      <h2
        id="sin-clientes"
        className="text-22 font-bold font-stretch-108% tracking-[-0.01em]"
      >
        Todavía no cargaste ningún cliente
      </h2>
      <p className="mt-2 text-muted">
        Creá el primero y después armale el calendario del mes.
      </p>
      <div className="mt-5 flex">{newClient}</div>
    </section>
  );
}
