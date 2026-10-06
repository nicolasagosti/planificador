import { CalendarStatusIcon } from "@/components/status/calendar-status-icon";
import { HeadlineText } from "@/components/status/headline-text";
import { SquareRow } from "@/components/status/square";
import type { MonthKey } from "@/domain/dates";
import {
  calendarHeadline,
  calendarOverdueNote,
  calendarStatusLine,
  squaresDescription,
} from "@/domain/phrases";
import { countPieces, squares, type PieceState } from "@/domain/pieces";
import type { CalendarStatus } from "@/domain/statuses";
import type { CalendarDay } from "@/domain/today";
import { cx } from "@/lib/cx";

type CalendarState = {
  status: CalendarStatus;
  sentOn: CalendarDay | null;
  approvedOn: CalendarDay | null;
  pieces: readonly PieceState[];
};

/** "✓ Aprobado el 28 sep. Las fechas y los temas quedaron fijos: …" */
export function CalendarStatusLine({
  calendar,
  day,
}: {
  calendar: CalendarState;
  day: CalendarDay;
}) {
  const line = calendarStatusLine(calendar, day);
  return (
    <p className="mt-2.5 flex max-w-line items-start gap-2">
      <span className="mt-[3px] flex">
        <CalendarStatusIcon status={calendar.status} />
      </span>
      <span>
        <strong className="font-bold">{line.lead}</strong>
        {line.rest && <span className="text-muted"> {line.rest}</span>}
      </span>
    </p>
  );
}

/**
 * The three numbers of an approved calendar, its row of squares and how
 * many pieces are overdue.
 */
export function CalendarSummary({
  calendar,
  month,
  day,
}: {
  calendar: CalendarState;
  month: MonthKey;
  day: CalendarDay;
}) {
  const counts = countPieces(calendar.pieces, day);
  const note = calendarOverdueNote(counts.overdue);
  return (
    <>
      <p className="mt-7 max-w-summary text-summary leading-[1.25] font-medium font-stretch-106% tracking-[-0.01em] text-balance">
        <HeadlineText segments={calendarHeadline(counts, month)} />
      </p>
      <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2">
        <SquareRow
          squares={squares(calendar.status, calendar.pieces, day)}
          label={squaresDescription(calendar.status, calendar.pieces, day)}
          gapClass="gap-1"
          squareClass="size-4 rounded-square"
        />
        <span
          className={cx(
            note.overdue ? "font-bold text-overdue-text" : "text-muted",
          )}
        >
          {note.text}
        </span>
      </div>
    </>
  );
}
