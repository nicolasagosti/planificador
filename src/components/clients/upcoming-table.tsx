import { PieceStateLabel } from "@/components/status/piece-state-label";
import type { PieceStatus } from "@/domain/statuses";
import { cx } from "@/lib/cx";

export type UpcomingRow = {
  id: string;
  /** "vie 2 oct" */
  date: string;
  /** "Post en Facebook" */
  what: string;
  topic: string;
  state: { text: string; square: PieceStatus | "overdue" };
};

const columns = "grid grid-cols-[92px_190px_minmax(0,1fr)_190px] gap-x-5";

/** Cliente, "Lo que sigue": the next pieces not delivered yet. */
export function UpcomingTable({
  rows,
  labelledBy,
}: {
  rows: UpcomingRow[];
  labelledBy: string;
}) {
  return (
    <div className="relative mt-2.5 overflow-x-auto">
      <div
        role="table"
        aria-labelledby={labelledBy}
        className="min-w-[640px] border-t-[1.5px] border-ink"
      >
        <div role="rowgroup">
          {rows.map((row) => (
            <div
              key={row.id}
              role="row"
              className={cx(
                columns,
                "items-center border-b border-line px-3 py-3.5",
              )}
            >
              <div role="cell" className="font-semibold">
                {row.date}
              </div>
              <div role="cell" className="text-muted">
                {row.what}
              </div>
              <div role="cell" className="font-semibold">
                {row.topic}
              </div>
              <div role="cell">
                <PieceStateLabel
                  text={row.state.text}
                  square={row.state.square}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
