import { Fragment } from "react";
import type { Segment } from "@/domain/phrases";
import type { PieceStatus } from "@/domain/statuses";
import { cx } from "@/lib/cx";

const FILL: Record<PieceStatus, string> = {
  pending: "bg-pending",
  done: "bg-done",
  delivered: "bg-delivered",
};

// The yellow square needs its darker edge; thicker on the biggest headline.
const PENDING_EDGE = {
  thick: "shadow-[inset_0_0_0_2px_var(--color-pending-edge)]",
  thin: "shadow-[inset_0_0_0_1.5px_var(--color-pending-edge)]",
};

/**
 * A headline sentence: each number goes after the square of its state and
 * stays on one line with its word.
 */
export function HeadlineText({
  segments,
  edge = "thin",
}: {
  segments: readonly Segment[];
  edge?: keyof typeof PENDING_EDGE;
}) {
  return segments.map((segment, index) =>
    segment.kind === "text" ? (
      <Fragment key={index}>{segment.text}</Fragment>
    ) : (
      <span key={index} className="whitespace-nowrap">
        <span
          aria-hidden="true"
          className={cx(
            "mr-[0.22em] inline-block size-[0.55em] rounded-[0.12em]",
            FILL[segment.status],
            segment.status === "pending" && PENDING_EDGE[edge],
          )}
        />
        <strong className="font-extrabold">{segment.value}</strong>
        {segment.after}
      </span>
    ),
  );
}
