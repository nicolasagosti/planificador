"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import type {
  PieceField,
  PieceResult,
  SavePieceResult,
} from "@/app/(app)/clientes/[clientId]/calendarios/piece-actions";
import { linkButton, primaryButton } from "@/components/ui/buttons";
import { fieldClass, labelClass } from "@/components/ui/fields";
import {
  FORMAT_LABELS,
  FORMATS,
  formatOnNetwork,
  NETWORK_LABELS,
  NETWORKS,
  type Network,
} from "@/domain/catalog";
import { firstDayOf, lastDayOf, type MonthKey } from "@/domain/dates";
import { dueLine } from "@/domain/phrases";
import type { CalendarDay } from "@/domain/today";
import { cx } from "@/lib/cx";
import { CalendarGrid } from "./calendar-grid";
import { useSelectedPiece } from "./use-selected-piece";

export type PlanningPiece = {
  id: string;
  date: CalendarDay;
  status: "pending" | "done" | "delivered";
  format: string;
  network: string;
  topic: string;
  idea: string | null;
};

type PieceInput = Record<PieceField, string>;

/**
 * A draft or a sent calendar: the grid with neutral pieces and the panel.
 * In a draft each day adds a piece and the panel is the piece's form; once
 * sent the pieces are read only until the calendar goes back to draft.
 */
export function PlanningCalendar({
  month,
  status,
  pieces,
  today,
  initialSelectedId,
  defaultNetwork,
  savePiece,
  deletePiece,
}: {
  month: MonthKey;
  status: "draft" | "sent";
  pieces: PlanningPiece[];
  today: CalendarDay;
  initialSelectedId: string | null;
  defaultNetwork: Network;
  savePiece: (
    pieceId: string | null,
    input: PieceInput,
  ) => Promise<SavePieceResult>;
  deletePiece: (pieceId: string) => Promise<PieceResult>;
}) {
  const {
    selectedId,
    select: selectPiece,
    panelRef,
  } = useSelectedPiece(
    pieces.find((piece) => piece.id === initialSelectedId)?.id ?? null,
  );
  const [newDay, setNewDay] = useState<CalendarDay | null>(null);
  const selected = pieces.find((piece) => piece.id === selectedId);
  const draft = status === "draft";

  function select(id: string | null) {
    setNewDay(null);
    selectPiece(id);
  }

  function add(day: CalendarDay) {
    selectPiece(null);
    setNewDay(day);
  }

  let panel: React.ReactNode;
  if (draft && newDay) {
    panel = (
      <PieceForm
        key={`new-${newDay}`}
        month={month}
        piece={null}
        initial={{
          date: newDay,
          network: defaultNetwork,
          format: "",
          topic: "",
          idea: "",
        }}
        save={(input) => savePiece(null, input)}
        onSaved={(id) => select(id)}
        onCancel={() => setNewDay(null)}
      />
    );
  } else if (draft && selected) {
    panel = (
      <PieceForm
        key={selected.id}
        month={month}
        piece={selected}
        initial={{
          date: selected.date,
          network: selected.network,
          format: selected.format,
          topic: selected.topic,
          idea: selected.idea ?? "",
        }}
        save={(input) => savePiece(selected.id, input)}
        onSaved={() => undefined}
        onCancel={() => select(null)}
        remove={async () => {
          const result = await deletePiece(selected.id);
          if (result.ok) select(null);
          return result;
        }}
      />
    );
  } else if (selected) {
    panel = <PieceDetails piece={selected} />;
  } else {
    panel = (
      <p className="text-muted">
        {draft
          ? "Elegí una pieza para cambiarla, o tocá + en un día para agregar otra."
          : "Elegí una pieza para ver su idea."}
      </p>
    );
  }

  return (
    <div className="mt-8 flex flex-wrap items-start gap-10">
      <div className="min-w-0 flex-[999_1_640px]">
        <CalendarGrid
          month={month}
          pieces={pieces}
          calendarStatus={status}
          today={today}
          selectedId={selectedId}
          onSelect={select}
          onAdd={draft ? add : undefined}
        />
      </div>
      <div ref={panelRef} className="min-w-0 flex-[1_1_300px] scroll-mt-4">
        <aside
          aria-label={newDay ? "Nueva pieza" : "Pieza elegida"}
          className="border-t-[1.5px] border-ink pt-4"
        >
          {panel}
        </aside>
      </div>
    </div>
  );
}

/** A piece of a sent calendar, read only. */
function PieceDetails({ piece }: { piece: PlanningPiece }) {
  return (
    <>
      <div className="text-13 font-semibold text-muted">
        {formatOnNetwork(piece.format, piece.network)}
      </div>
      <h2 className="mt-1 text-24 leading-[1.2] font-bold font-stretch-106% tracking-[-0.01em] text-balance">
        {piece.topic}
      </h2>
      <div className="mt-1.5">{dueLine(piece.date)}</div>
      {piece.idea && (
        <p className="mt-3 whitespace-pre-line text-muted">{piece.idea}</p>
      )}
      <p className="mt-4 border-t border-line pt-3.5 text-13 text-muted">
        Para cambiarla, volvé el calendario a borrador.
      </p>
    </>
  );
}

function PieceForm({
  month,
  piece,
  initial,
  save,
  onSaved,
  onCancel,
  remove,
}: {
  month: MonthKey;
  piece: PlanningPiece | null;
  initial: PieceInput;
  save: (input: PieceInput) => Promise<SavePieceResult>;
  onSaved: (id: string) => void;
  onCancel: () => void;
  remove?: () => Promise<PieceResult>;
}) {
  const ids = {
    date: useId(),
    network: useId(),
    format: useId(),
    topic: useId(),
    idea: useId(),
  };
  const [errors, setErrors] = useState<Partial<Record<PieceField, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [removing, startRemoving] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (name: PieceField) => String(data.get(name) ?? "");
    const input: PieceInput = {
      date: text("date"),
      network: text("network"),
      format: text("format"),
      topic: text("topic"),
      idea: text("idea"),
    };
    setSaved(false);
    startTransition(async () => {
      try {
        const result = await save(input);
        if (result.ok) {
          setErrors({});
          setFailure(null);
          setSaved(true);
          onSaved(result.id);
        } else if ("errors" in result) {
          setErrors(result.errors);
          setFailure(null);
        } else {
          setErrors({});
          setFailure(result.message);
        }
      } catch {
        setFailure("No pudimos guardar la pieza. Probá de nuevo.");
      }
    });
  }

  function handleRemove() {
    if (!remove) return;
    startRemoving(async () => {
      try {
        const result = await remove();
        if (!result.ok) setFailure(result.message);
      } catch {
        setFailure("No pudimos eliminar la pieza. Probá de nuevo.");
      }
    });
  }

  const describedBy = (field: PieceField) =>
    errors[field] ? `${ids[field]}-error` : undefined;
  const fieldError = (field: PieceField) =>
    errors[field] && (
      <p id={`${ids[field]}-error`} className="text-13 font-semibold">
        {errors[field]}
      </p>
    );

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <h2 className="text-24 leading-[1.2] font-bold font-stretch-106% tracking-[-0.01em] text-balance">
        {piece ? piece.topic : "Nueva pieza"}
      </h2>
      {failure && (
        <p
          role="alert"
          className="rounded-button border-[1.5px] border-ink px-3 py-2.5 font-semibold"
        >
          {failure}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.date} className={labelClass}>
          Fecha
        </label>
        <input
          id={ids.date}
          name="date"
          type="date"
          min={firstDayOf(month)}
          max={lastDayOf(month)}
          defaultValue={initial.date}
          aria-invalid={Boolean(errors.date)}
          aria-describedby={describedBy("date")}
          className={fieldClass}
        />
        {fieldError("date")}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.network} className={labelClass}>
            Red
          </label>
          <select
            id={ids.network}
            name="network"
            defaultValue={initial.network}
            aria-invalid={Boolean(errors.network)}
            aria-describedby={describedBy("network")}
            className={fieldClass}
          >
            {NETWORKS.map((code) => (
              <option key={code} value={code}>
                {NETWORK_LABELS[code].name}
              </option>
            ))}
          </select>
          {fieldError("network")}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.format} className={labelClass}>
            Formato
          </label>
          <select
            id={ids.format}
            name="format"
            defaultValue={initial.format}
            aria-invalid={Boolean(errors.format)}
            aria-describedby={describedBy("format")}
            className={fieldClass}
          >
            <option value="" disabled>
              Elegí el formato
            </option>
            {FORMATS.map((code) => (
              <option key={code} value={code}>
                {FORMAT_LABELS[code]}
              </option>
            ))}
          </select>
          {fieldError("format")}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.topic} className={labelClass}>
          Tema
        </label>
        <input
          id={ids.topic}
          name="topic"
          type="text"
          defaultValue={initial.topic}
          maxLength={120}
          autoFocus={!piece}
          aria-invalid={Boolean(errors.topic)}
          aria-describedby={describedBy("topic")}
          className={fieldClass}
        />
        {fieldError("topic")}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.idea} className={labelClass}>
          Idea
        </label>
        <textarea
          id={ids.idea}
          name="idea"
          rows={4}
          defaultValue={initial.idea}
          maxLength={2000}
          aria-invalid={Boolean(errors.idea)}
          aria-describedby={describedBy("idea")}
          className={cx(fieldClass, "py-2.5")}
        />
        {fieldError("idea")}
      </div>

      <div className="flex flex-col items-stretch gap-1">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Guardando…" : piece ? "Guardar" : "Agregar pieza"}
        </button>
        {saved && !pending && piece && (
          <p role="status" className="text-center text-13 text-muted">
            Guardado.
          </p>
        )}
        {remove ? (
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            className={cx(linkButton, "justify-center")}
          >
            {removing ? "Eliminando…" : "Eliminar pieza"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className={cx(linkButton, "justify-center")}
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
