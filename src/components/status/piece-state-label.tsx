import type { PieceStatus } from "@/domain/statuses";
import { cx } from "@/lib/cx";
import { Square } from "./square";

/** "▪ Hecha, falta entregarla", or the red diamond and "Atrasada" in bold. */
export function PieceStateLabel({
  text,
  square,
}: {
  text: string;
  square: PieceStatus | "overdue";
}) {
  const overdue = square === "overdue";
  return (
    <div
      className={cx(
        "flex items-center gap-[9px]",
        overdue && "font-bold text-overdue-text",
      )}
    >
      <Square
        kind={square}
        className={
          overdue ? "size-3 rounded-square-sm" : "size-3 rounded-square"
        }
        overdueScale="scale-85"
      />
      <span>{text}</span>
    </div>
  );
}
