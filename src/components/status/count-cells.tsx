import type { Square as SquareKind } from "@/domain/pieces";
import { cx } from "@/lib/cx";
import { Square } from "./square";

/** "▪ Debés": a numeric column's header, with the square of its state. */
export function NumberHeader({
  kind,
  children,
}: {
  kind: SquareKind;
  children: string;
}) {
  return (
    <div role="columnheader" className="flex items-center justify-end gap-1.5">
      <Square kind={kind} className="size-2.5 rounded-square-sm" />
      <span>{children}</span>
    </div>
  );
}

/** A count; zero in gray, and a dash while the calendar does not count. */
export function NumberCell({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <div role="cell" className="text-right text-22 font-medium text-muted">
        <span aria-hidden="true">–</span>
        <span className="sr-only">No cuenta todavía</span>
      </div>
    );
  }
  return (
    <div
      role="cell"
      className={cx(
        "text-right text-22 tabular-nums",
        value === 0 ? "font-medium text-muted" : "font-bold",
      )}
    >
      {value}
    </div>
  );
}
