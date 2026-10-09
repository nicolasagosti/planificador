import { PlusIcon } from "@/components/icons";
import { Square } from "@/components/status/square";
import { formatLabel, networkShort } from "@/domain/catalog";
import {
  dayOfMonth,
  monthGrid,
  weekdayAndDay,
  WEEKDAYS_SHORT,
  type MonthKey,
} from "@/domain/dates";
import { pieceAriaLabel } from "@/domain/phrases";
import { isOverdue, squareFor, type PieceState } from "@/domain/pieces";
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
// the diamond and the word "Atrasada". Pieces of drafts and sent calendars
// do not count yet: white, a thin border and a hollow square.
const TONE = {
  pending: "bg-pending-soft",
  done: "bg-done-soft",
  delivered: "bg-delivered-soft",
  overdue: "bg-overdue-soft",
  draft: "border border-line bg-surface",
  sent: "border border-line bg-surface",
} as const;

/**
 * The month from Monday to Sunday. Days of other months are shaded and
 * empty; today is marked. Each piece is a button that selects it; with
 * `onAdd` (drafts), each day of the month also adds a piece.
 */
export function CalendarGrid({
  month,
  pieces,
  calendarStatus,
  today,
  selectedId,
  onSelect,
  onAdd,
}: {
  month: MonthKey;
  /** By day; pieces of a day in the order they were created. */
  pieces: readonly GridPiece[];
  calendarStatus: CalendarStatus;
  today: CalendarDay;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd?: (day: CalendarDay) => void;
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
                  "group flex min-h-[142px] flex-col gap-1.5 p-2",
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
                    const tone = squareFor(calendarStatus, piece, today);
                    const overdue =
                      calendarStatus === "approved" && isOverdue(piece, today);
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
                {inMonth && onAdd && (
                  <button
                    type="button"
                    aria-label={`Agregar una pieza el ${weekdayAndDay(day)}`}
                    onClick={() => onAdd(day)}
                    className="mt-auto flex min-h-11 w-full cursor-pointer items-center justify-center rounded-piece text-muted opacity-0 group-hover:opacity-100 hover:bg-row-hover focus-visible:opacity-100 pointer-coarse:opacity-100"
                  >
                    <PlusIcon size={16} />
                  </button>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
