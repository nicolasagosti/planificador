import { Square } from "@/components/status/square";
import { formatLabel, networkShort } from "@/domain/catalog";
import {
  dayOfMonth,
  monthGrid,
  WEEKDAYS_SHORT,
  type MonthKey,
} from "@/domain/dates";
import { pieceAriaLabel } from "@/domain/phrases";
import { isOverdue, type PieceState } from "@/domain/pieces";
import type { CalendarStatus } from "@/domain/statuses";
import type { CalendarDay } from "@/domain/today";
import { cx } from "@/lib/cx";

export type GridPiece = PieceState & {
  id: string;
  format: string;
  network: string;
  topic: string;
};

// Color means state: the piece's background, its square and, when overdue,
// the diamond and the word "Atrasada".
const TONE = {
  pending: "bg-pending-soft",
  done: "bg-done-soft",
  delivered: "bg-delivered-soft",
  overdue: "bg-overdue-soft",
} as const;

/**
 * The month from Monday to Sunday. Days of other months are shaded and
 * empty; today is marked. Each piece is a button that selects it.
 */
export function CalendarGrid({
  month,
  pieces,
  calendarStatus,
  today,
  selectedId,
  onSelect,
}: {
  month: MonthKey;
  /** By day; pieces of a day in the order they were created. */
  pieces: readonly GridPiece[];
  calendarStatus: CalendarStatus;
  today: CalendarDay;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const byDay = new Map<CalendarDay, GridPiece[]>();
  for (const piece of pieces) {
    byDay.set(piece.date, [...(byDay.get(piece.date) ?? []), piece]);
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[780px] grid-cols-7 gap-px overflow-hidden rounded-grid border border-line bg-line">
        {WEEKDAYS_SHORT.map((weekday) => (
          <div
            key={weekday}
            aria-hidden="true"
            className="bg-page px-2.5 py-2 text-13 font-semibold text-muted"
          >
            {weekday}
          </div>
        ))}
        {monthGrid(month)
          .flat()
          .map(({ day, inMonth }) => {
            const isToday = inMonth && day === today;
            return (
              <div
                key={day}
                className={cx(
                  "flex min-h-[142px] flex-col gap-1.5 p-2",
                  inMonth ? "bg-surface" : "bg-outside",
                )}
              >
                <div className="flex min-h-6 items-center gap-1.5">
                  <span
                    className={cx(
                      "flex h-6 min-w-6 items-center justify-center rounded-piece px-[5px] text-13 font-semibold tabular-nums",
                      isToday && "bg-ink text-surface",
                      !inMonth && "text-muted",
                    )}
                  >
                    {dayOfMonth(day)}
                  </span>
                  {isToday && <span className="text-12 font-bold">hoy</span>}
                </div>
                {inMonth &&
                  (byDay.get(day) ?? []).map((piece) => {
                    const overdue = isOverdue(piece, today);
                    const tone = overdue ? "overdue" : piece.status;
                    const selected = piece.id === selectedId;
                    return (
                      <button
                        key={piece.id}
                        type="button"
                        aria-pressed={selected}
                        aria-label={pieceAriaLabel(
                          piece,
                          calendarStatus,
                          today,
                        )}
                        onClick={() => onSelect(piece.id)}
                        className={cx(
                          "flex min-h-11 w-full cursor-pointer flex-col items-stretch gap-0.5 rounded-piece px-2 py-[7px] text-left",
                          TONE[tone],
                          selected &&
                            "shadow-[inset_0_0_0_2px_var(--color-ink)]",
                        )}
                      >
                        <span className="flex items-center gap-1.5 text-12 font-bold">
                          <Square
                            kind={tone}
                            className="size-2.5 rounded-square-sm"
                            overdueScale="scale-85"
                          />
                          <span>{formatLabel(piece.format)}</span>
                          <span className="font-medium text-muted">
                            {networkShort(piece.network)}
                          </span>
                        </span>
                        <span className="text-13 leading-[1.3]">
                          {piece.topic}
                        </span>
                        {overdue && (
                          <span className="text-12 font-bold text-overdue-text">
                            Atrasada
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            );
          })}
      </div>
    </div>
  );
}
