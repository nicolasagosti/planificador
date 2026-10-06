"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { createCalendar } from "@/app/(app)/clientes/[clientId]/calendarios/actions";
import { ChevronRightIcon } from "@/components/icons";
import { CalendarStatusIcon } from "@/components/status/calendar-status-icon";
import { NumberCell, NumberHeader } from "@/components/status/count-cells";
import { SquareRow } from "@/components/status/square";
import type { MonthKey } from "@/domain/dates";
import {
  CLIENT_FILTER_EMPTY,
  CLIENT_FILTER_LABELS,
  CLIENT_FILTERS,
  type ClientFilter,
} from "@/domain/month-overview";
import {
  createCalendarLabel,
  type CalendarCell,
  type NextDelivery,
} from "@/domain/phrases";
import type { Square as SquareKind } from "@/domain/pieces";
import { cx } from "@/lib/cx";

export type ClientRow = {
  id: string;
  name: string;
  industry: string | null;
  cell: CalendarCell;
  /** Debés, hechas, entregadas; null while the calendar does not count. */
  numbers: [pending: number, done: number, delivered: number] | null;
  squares: SquareKind[];
  squaresLabel: string;
  next: NextDelivery;
  filters: Record<Exclude<ClientFilter, "all">, boolean>;
};

// The mockup's columns: client, calendar, three numbers, the squares, the
// next delivery and the arrow.
const columns =
  "grid grid-cols-[minmax(0,1.1fr)_196px_64px_68px_96px_minmax(0,1.5fr)_124px_20px] gap-x-5";

export function ClientsTable({
  rows,
  counts,
  month,
  monthName,
  monthTitleName,
  newClient,
}: {
  rows: ClientRow[];
  counts: Record<ClientFilter, number>;
  month: MonthKey;
  /** "octubre" */
  monthName: string;
  /** "Octubre" */
  monthTitleName: string;
  newClient: ReactNode;
}) {
  const [filter, setFilter] = useState<ClientFilter>("all");
  const visible = rows.filter((row) => filter === "all" || row.filters[filter]);

  return (
    <section aria-labelledby="clientes" className="mt-11">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-1">
          <h2
            id="clientes"
            className="text-22 font-bold font-stretch-108% tracking-[-0.01em]"
          >
            Clientes
          </h2>
          <div className="flex flex-wrap gap-x-[22px]">
            {CLIENT_FILTERS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={filter === option}
                onClick={() => setFilter(option)}
                className={cx(
                  "min-h-11 cursor-pointer text-14",
                  filter === option
                    ? "font-semibold text-ink shadow-[inset_0_-2px_0_var(--color-ink)]"
                    : "font-medium text-muted hover:text-ink",
                )}
              >
                {CLIENT_FILTER_LABELS[option]} ({counts[option]})
              </button>
            ))}
          </div>
        </div>
        {newClient}
      </div>

      <div className="relative mt-2.5 overflow-x-auto">
        <div role="table" aria-labelledby="clientes" className="min-w-[1040px]">
          <div role="rowgroup">
            <div
              role="row"
              className={cx(
                columns,
                "items-end border-b-[1.5px] border-ink px-3 py-2.5 text-13 font-semibold text-muted",
              )}
            >
              <div role="columnheader">Cliente</div>
              <div role="columnheader">Calendario de {monthName}</div>
              <NumberHeader kind="pending">Debés</NumberHeader>
              <NumberHeader kind="done">Hechas</NumberHeader>
              <NumberHeader kind="delivered">Entregadas</NumberHeader>
              <div role="columnheader">{monthTitleName}, pieza por pieza</div>
              <div role="columnheader">Próxima entrega</div>
              <div role="columnheader">
                <span className="sr-only">Abrir</span>
              </div>
            </div>
          </div>
          <div role="rowgroup">
            {visible.map((row) => (
              <ClientRowView key={row.id} row={row} month={month} />
            ))}
            {visible.length === 0 && (
              <div
                role="row"
                className="border-b border-line px-3 py-6 text-muted"
              >
                <div role="cell">{CLIENT_FILTER_EMPTY[filter]}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ClientRowView({ row, month }: { row: ClientRow; month: MonthKey }) {
  return (
    <div
      role="row"
      className={cx(
        columns,
        "group relative items-center border-b border-line px-3 py-4 hover:bg-row-hover",
        "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-ink",
      )}
    >
      <div role="cell">
        {/* The name's link covers the whole row. */}
        <Link
          href={`/clientes/${row.id}` as Route}
          className="text-17 font-bold font-stretch-105% text-ink no-underline after:absolute after:inset-0 focus-visible:outline-none"
        >
          {row.name}
        </Link>
        {row.industry && (
          <div className="text-13 text-muted">{row.industry}</div>
        )}
      </div>

      <div role="cell">
        <div className="flex items-center gap-[7px] font-semibold">
          {row.cell.status !== "none" && (
            <CalendarStatusIcon status={row.cell.status} />
          )}
          <span>{row.cell.label}</span>
        </div>
        {row.cell.status === "none" ? (
          // Above the name's link that covers the row.
          <form
            action={createCalendar.bind(null, row.id)}
            className="relative z-10"
          >
            <input type="hidden" name="month" value={month} />
            <CreateCalendarButton>
              {createCalendarLabel(month)}
            </CreateCalendarButton>
          </form>
        ) : (
          row.cell.detail && (
            <div className="pl-[23px] text-13 text-muted">
              {row.cell.detail}
            </div>
          )
        )}
      </div>

      <NumberCell value={row.numbers?.[0] ?? null} />
      <NumberCell value={row.numbers?.[1] ?? null} />
      <NumberCell value={row.numbers?.[2] ?? null} />

      <div role="cell">
        <SquareRow squares={row.squares} label={row.squaresLabel} />
      </div>

      <NextDeliveryCell next={row.next} />

      <div role="cell">
        <ChevronRightIcon className="text-muted group-hover:text-ink" />
      </div>
    </div>
  );
}

/** Creates the month's calendar and opens it. 44px high, one line tall. */
function CreateCalendarButton({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="-my-3 inline-flex min-h-11 cursor-pointer items-center text-13 font-semibold text-ink underline underline-offset-2 disabled:cursor-wait"
    >
      {pending ? "Creando…" : children}
    </button>
  );
}

function NextDeliveryCell({ next }: { next: NextDelivery }) {
  switch (next.kind) {
    case "date":
      return (
        <div role="cell">
          <div className="font-semibold">{next.date}</div>
          <div
            className={cx(
              "text-13",
              next.overdue ? "font-semibold text-overdue-text" : "text-muted",
            )}
          >
            {next.note}
          </div>
        </div>
      );
    case "note":
      return (
        <div role="cell" className="text-13 text-muted">
          {next.note}
        </div>
      );
    case "none":
      return <div role="cell" />;
  }
}
