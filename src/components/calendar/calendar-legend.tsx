import { Square } from "@/components/status/square";
import { networkLegend } from "@/domain/catalog";
import { SQUARE_LEGEND } from "@/domain/phrases";

const KINDS = ["pending", "done", "delivered", "overdue"] as const;

/** Under the grid: what each square means and the networks in use. */
export function CalendarLegend({ networks }: { networks: readonly string[] }) {
  const legend = networkLegend(networks);
  return (
    <div className="mt-3.5 flex flex-wrap gap-x-6 gap-y-1.5 text-13 text-muted">
      {KINDS.map((kind) => (
        <span key={kind} className="flex items-center gap-2">
          <Square
            kind={kind}
            className="size-[11px] rounded-square-sm"
            overdueScale="scale-85"
          />
          <span>{SQUARE_LEGEND[kind]}</span>
        </span>
      ))}
      {legend && <span>{legend}</span>}
    </div>
  );
}
