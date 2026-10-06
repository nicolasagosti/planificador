import type { Route } from "next";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { addMonths, monthTitle, type MonthKey } from "@/domain/dates";

const arrow =
  "flex size-11 items-center justify-center rounded-button text-ink hover:bg-control-hover";

/** Month selector of the Clientes screen: "‹ Octubre 2026 ›". */
export function MonthNav({ month }: { month: MonthKey }) {
  return (
    <nav aria-label="Mes" className="-ml-3 flex items-center gap-0.5">
      <Link
        href={`/?mes=${addMonths(month, -1)}` as Route}
        aria-label="Mes anterior"
        className={arrow}
      >
        <ChevronLeftIcon />
      </Link>
      <span className="min-w-28 text-center font-semibold">
        {monthTitle(month)}
      </span>
      <Link
        href={`/?mes=${addMonths(month, 1)}` as Route}
        aria-label="Mes siguiente"
        className={arrow}
      >
        <ChevronRightIcon />
      </Link>
    </nav>
  );
}
