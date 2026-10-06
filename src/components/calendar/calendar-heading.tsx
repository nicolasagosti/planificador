import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { addMonths, monthTitle, type MonthKey } from "@/domain/dates";
import { goToMonthLabel } from "@/domain/phrases";

const arrow =
  "flex size-11 items-center justify-center rounded-button text-ink hover:bg-control-hover";

/** "Octubre 2026 ‹ ›", with the calendar's actions on the right. */
export function CalendarHeading({
  month,
  hrefFor,
  actions,
}: {
  month: MonthKey;
  hrefFor: (month: MonthKey) => Route;
  actions?: ReactNode;
}) {
  const previous = addMonths(month, -1);
  const next = addMonths(month, 1);
  return (
    <div className="mt-2 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-title leading-[1.1] font-bold font-stretch-112% tracking-[-0.02em]">
          {monthTitle(month)}
        </h1>
        <nav aria-label="Meses" className="flex gap-0.5">
          <Link
            href={hrefFor(previous)}
            aria-label={goToMonthLabel(previous)}
            className={arrow}
          >
            <ChevronLeftIcon size={20} />
          </Link>
          <Link
            href={hrefFor(next)}
            aria-label={goToMonthLabel(next)}
            className={arrow}
          >
            <ChevronRightIcon size={20} />
          </Link>
        </nav>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
