import type { Route } from "next";
import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";
import { CalendarStatusIcon } from "@/components/status/calendar-status-icon";
import { NumberCell, NumberHeader } from "@/components/status/count-cells";
import { SquareRow } from "@/components/status/square";
import type { Square } from "@/domain/pieces";
import type { CalendarStatus } from "@/domain/statuses";
import { cx } from "@/lib/cx";

export type CalendarRow = {
  href: Route;
  /** "Octubre 2026" */
  title: string;
  status: CalendarStatus;
  /** "Aprobado el 28 sep, en curso" */
  statusText: string;
  numbers: [pending: number, done: number, delivered: number] | null;
  squares: Square[];
  squaresLabel: string;
};

const columns =
  "grid grid-cols-[210px_60px_64px_96px_minmax(0,1fr)_20px] gap-x-5";

/** Cliente, "Calendarios": the newest first; each row opens its calendar. */
export function ClientCalendarsTable({ rows }: { rows: CalendarRow[] }) {
  return (
    <div className="relative mt-2.5 overflow-x-auto">
      <div role="table" aria-labelledby="calendarios" className="min-w-[760px]">
        <div role="rowgroup">
          <div
            role="row"
            className={cx(
              columns,
              "items-end border-b-[1.5px] border-ink px-3 py-2.5 text-13 font-semibold text-muted",
            )}
          >
            <div role="columnheader">Mes</div>
            <NumberHeader kind="pending">Debés</NumberHeader>
            <NumberHeader kind="done">Hechas</NumberHeader>
            <NumberHeader kind="delivered">Entregadas</NumberHeader>
            <div role="columnheader">Pieza por pieza</div>
            <div role="columnheader">
              <span className="sr-only">Abrir</span>
            </div>
          </div>
        </div>
        <div role="rowgroup">
          {rows.map((row) => (
            <div
              key={row.href}
              role="row"
              className={cx(
                columns,
                "group relative items-center border-b border-line px-3 py-4 hover:bg-row-hover",
                "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-ink",
              )}
            >
              <div role="cell">
                <Link
                  href={row.href}
                  className="text-17 font-bold font-stretch-105% text-ink no-underline after:absolute after:inset-0 focus-visible:outline-none"
                >
                  {row.title}
                </Link>
                <div className="mt-0.5 flex items-center gap-[7px] text-13 text-muted">
                  <CalendarStatusIcon status={row.status} size={14} />
                  <span>{row.statusText}</span>
                </div>
              </div>
              <NumberCell value={row.numbers?.[0] ?? null} />
              <NumberCell value={row.numbers?.[1] ?? null} />
              <NumberCell value={row.numbers?.[2] ?? null} />
              <div role="cell">
                <SquareRow squares={row.squares} label={row.squaresLabel} />
              </div>
              <div role="cell">
                <ChevronRightIcon className="text-muted group-hover:text-ink" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
