"use client";

import { useOptimistic, useState, useTransition } from "react";
import type {
  AssetResult,
  PieceResult,
} from "@/app/(app)/clientes/[clientId]/calendarios/piece-actions";
import type { MonthKey } from "@/domain/dates";
import { applyPieceMove, planPieceMove } from "@/domain/piece-transitions";
import { firstNotDelivered } from "@/domain/pieces";
import type { PieceStatus } from "@/domain/statuses";
import type { CalendarDay } from "@/domain/today";
import { CalendarGrid } from "./calendar-grid";
import { CalendarLegend } from "./calendar-legend";
import { CalendarSummary } from "./calendar-status";
import { PiecePanel, type PanelPiece } from "./piece-panel";
import { useSelectedPiece } from "./use-selected-piece";

type Move = { id: string; to: PieceStatus };

/**
 * An approved calendar: its numbers, the grid and the panel of the selected
 * piece. A change of state shows at once in all three and goes back if the
 * server refuses it. The selected piece stays in the URL (?pieza=).
 */
export function ApprovedCalendar({
  month,
  pieces,
  approvedOn,
  today,
  initialSelectedId,
  movePiece,
  updatePieceAsset,
}: {
  month: MonthKey;
  pieces: PanelPiece[];
  approvedOn: CalendarDay;
  today: CalendarDay;
  initialSelectedId: string | null;
  movePiece: (id: string, from: string, to: string) => Promise<PieceResult>;
  updatePieceAsset: (
    id: string,
    input: { url: string; name: string },
  ) => Promise<AssetResult>;
}) {
  const [shown, applyMove] = useOptimistic(pieces, (current, move: Move) =>
    current.map((piece) => {
      if (piece.id !== move.id) return piece;
      const plan = planPieceMove({
        calendarStatus: "approved",
        from: piece.status,
        to: move.to,
      });
      return plan.ok ? applyPieceMove(piece, plan.move, today) : piece;
    }),
  );
  const [, startTransition] = useTransition();
  const {
    selectedId,
    select: selectPiece,
    panelRef,
  } = useSelectedPiece(
    pieces.find((piece) => piece.id === initialSelectedId)?.id ??
      firstNotDelivered(pieces)?.id ??
      pieces[0]?.id ??
      null,
  );
  const [failure, setFailure] = useState<string | null>(null);

  const selected = shown.find((piece) => piece.id === selectedId) ?? null;

  function select(id: string) {
    setFailure(null);
    selectPiece(id);
  }

  function move(piece: PanelPiece, to: PieceStatus) {
    setFailure(null);
    startTransition(async () => {
      applyMove({ id: piece.id, to });
      try {
        const result = await movePiece(piece.id, piece.status, to);
        if (!result.ok) setFailure(result.message);
      } catch {
        setFailure("No pudimos guardar el cambio. Probá de nuevo.");
      }
    });
  }

  return (
    <>
      <CalendarSummary
        calendar={{
          status: "approved",
          sentOn: null,
          approvedOn,
          pieces: shown,
        }}
        month={month}
        day={today}
      />
      <div className="mt-8 flex flex-wrap items-start gap-10">
        <div className="min-w-0 flex-[999_1_640px]">
          <CalendarGrid
            month={month}
            pieces={shown}
            calendarStatus="approved"
            today={today}
            selectedId={selectedId}
            onSelect={select}
          />
          <CalendarLegend networks={shown.map((piece) => piece.network)} />
        </div>
        <div ref={panelRef} className="min-w-0 flex-[1_1_300px] scroll-mt-4">
          {selected && (
            <PiecePanel
              piece={selected}
              approvedOn={approvedOn}
              today={today}
              failure={failure}
              onMove={(to) => move(selected, to)}
              saveAsset={(input) => updatePieceAsset(selected.id, input)}
            />
          )}
        </div>
      </div>
    </>
  );
}
