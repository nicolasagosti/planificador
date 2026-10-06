import type { Square as SquareKind } from "@/domain/pieces";
import { cx } from "@/lib/cx";

// Color means status, and never goes alone: each state also has its shape
// (the overdue diamond, the hollow squares of calendars that do not count).
const KIND: Record<SquareKind, string> = {
  pending: "bg-pending shadow-[inset_0_0_0_1.5px_var(--color-pending-edge)]",
  done: "bg-done",
  delivered: "bg-delivered",
  overdue: "rotate-45 scale-80 bg-overdue",
  sent: "shadow-[inset_0_0_0_1.5px_var(--color-hollow)]",
  draft: "border-[1.5px] border-dashed border-hollow",
};

/** One piece. The size comes from `className` (13px in tables). */
export function Square({
  kind,
  className = "size-[13px] rounded-square",
}: {
  kind: SquareKind;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cx("inline-block shrink-0", KIND[kind], className)}
    />
  );
}

/** The pieces of a calendar, one square each, in date order. */
export function SquareRow({
  squares,
  label,
  gapClass = "gap-[3px]",
  squareClass,
}: {
  squares: readonly SquareKind[];
  label: string;
  gapClass?: string;
  squareClass?: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cx("flex flex-wrap", gapClass)}
    >
      {squares.map((kind, index) => (
        <Square key={index} kind={kind} className={squareClass} />
      ))}
    </div>
  );
}
