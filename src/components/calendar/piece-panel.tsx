"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import type {
  AssetField,
  AssetResult,
} from "@/app/(app)/clientes/[clientId]/calendarios/piece-actions";
import { Square } from "@/components/status/square";
import { linkButton, primaryButton } from "@/components/ui/buttons";
import { fieldClass, labelClass } from "@/components/ui/fields";
import { formatOnNetwork } from "@/domain/catalog";
import { pieceActions, type PieceProgress } from "@/domain/piece-transitions";
import {
  assetLink,
  dueLine,
  OVERDUE_ALERT,
  pieceSteps,
} from "@/domain/phrases";
import { isOverdue } from "@/domain/pieces";
import type { PieceStatus } from "@/domain/statuses";
import type { CalendarDay } from "@/domain/today";
import { cx } from "@/lib/cx";

export type PanelPiece = PieceProgress & {
  id: string;
  date: CalendarDay;
  format: string;
  network: string;
  topic: string;
  idea: string | null;
  assetUrl: string | null;
  assetName: string | null;
};

/**
 * The selected piece of an approved calendar: what it is, its three steps
 * with their days, the action that moves it and its file.
 */
export function PiecePanel({
  piece,
  approvedOn,
  today,
  failure,
  onMove,
  saveAsset,
}: {
  piece: PanelPiece;
  approvedOn: CalendarDay;
  today: CalendarDay;
  /** Why the server refused the last change, if it did. */
  failure: string | null;
  onMove: (to: PieceStatus) => void;
  saveAsset: (input: { url: string; name: string }) => Promise<AssetResult>;
}) {
  const overdue = isOverdue(piece, today);
  const actions = pieceActions(piece.status);
  return (
    <aside
      aria-label="Pieza elegida"
      className="border-t-[1.5px] border-ink pt-4"
    >
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

      {overdue && (
        <p className="mt-3.5 rounded-button bg-overdue-soft px-3 py-2.5 font-semibold text-overdue-text">
          {OVERDUE_ALERT}
        </p>
      )}

      <ol className="mt-[18px] border-b border-line">
        {pieceSteps(piece, approvedOn, today).map((step) => (
          <li
            key={step.status}
            className="flex items-center gap-3 border-t border-line py-[11px]"
          >
            <Square
              kind={step.reached ? step.status : "sent"}
              className="size-[13px] rounded-square"
            />
            <span
              className={cx(
                "flex-1",
                step.current ? "font-bold" : "font-medium",
                !step.reached && "text-muted",
              )}
            >
              {step.label}
            </span>
            <span className="text-13 text-muted">{step.when}</span>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-col items-stretch gap-1">
        {failure && (
          <p
            role="alert"
            className="mb-2 rounded-button border-[1.5px] border-ink px-3 py-2.5 font-semibold"
          >
            {failure}
          </p>
        )}
        {actions.forward && (
          <button
            type="button"
            onClick={() => actions.forward && onMove(actions.forward.to)}
            className={cx(primaryButton, "min-h-12")}
          >
            {actions.forward.label}
          </button>
        )}
        {actions.finished && (
          <p className="font-semibold">{actions.finished}</p>
        )}
        {actions.back && (
          <button
            type="button"
            onClick={() => actions.back && onMove(actions.back.to)}
            className={cx(linkButton, "justify-center")}
          >
            {actions.back.label}
          </button>
        )}
      </div>

      <AssetSection
        // A new piece starts with the form closed.
        key={piece.id}
        url={piece.assetUrl}
        name={piece.assetName}
        save={saveAsset}
      />
    </aside>
  );
}

function AssetSection({
  url,
  name,
  save,
}: {
  url: string | null;
  name: string | null;
  save: (input: { url: string; name: string }) => Promise<AssetResult>;
}) {
  const [editing, setEditing] = useState(false);
  const link = url ? assetLink(url, name) : null;
  return (
    <div className="mt-3 border-t border-line pt-3.5">
      <div className="text-13 font-semibold text-muted">Archivo</div>
      {editing ? (
        <AssetForm
          url={url}
          name={name}
          save={save}
          onDone={() => setEditing(false)}
        />
      ) : link && url ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-x-3">
            <span className="[overflow-wrap:anywhere]">{link.label}</span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={linkButton}
            >
              {link.openLabel}
            </a>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={cx(linkButton, "text-13 text-muted")}
          >
            Cambiar el link
          </button>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-x-3">
          <span className="text-muted">Todavía no cargaste nada.</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={linkButton}
          >
            Pegar un link
          </button>
        </div>
      )}
    </div>
  );
}

function AssetForm({
  url,
  name,
  save,
  onDone,
}: {
  url: string | null;
  name: string | null;
  save: (input: { url: string; name: string }) => Promise<AssetResult>;
  onDone: () => void;
}) {
  const urlId = useId();
  const nameId = useId();
  const [errors, setErrors] = useState<Partial<Record<AssetField, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = {
      url: String(data.get("url") ?? ""),
      name: String(data.get("name") ?? ""),
    };
    startTransition(async () => {
      try {
        const result = await save(input);
        if (result.ok) {
          onDone();
        } else if ("errors" in result) {
          setErrors(result.errors);
          setFailure(null);
        } else {
          setErrors({});
          setFailure(result.message);
        }
      } catch {
        setFailure("No pudimos guardar el link. Probá de nuevo.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-2 flex flex-col gap-3"
    >
      {failure && (
        <p
          role="alert"
          className="rounded-button border-[1.5px] border-ink px-3 py-2.5 font-semibold"
        >
          {failure}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={urlId} className={labelClass}>
          Link
        </label>
        <input
          id={urlId}
          name="url"
          type="url"
          inputMode="url"
          defaultValue={url ?? ""}
          placeholder="https://drive.google.com/…"
          maxLength={2000}
          autoFocus
          aria-invalid={Boolean(errors.url)}
          aria-describedby={errors.url ? `${urlId}-error` : undefined}
          className={fieldClass}
        />
        {errors.url && (
          <p id={`${urlId}-error`} className="text-13 font-semibold">
            {errors.url}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={nameId} className={labelClass}>
          Nombre del archivo (opcional)
        </label>
        <input
          id={nameId}
          name="name"
          type="text"
          defaultValue={name ?? ""}
          maxLength={200}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? `${nameId}-error` : undefined}
          className={fieldClass}
        />
        {errors.name && (
          <p id={`${nameId}-error`} className="text-13 font-semibold">
            {errors.name}
          </p>
        )}
      </div>
      <p className="text-13 text-muted">
        Para quitar el link, dejalo vacío y guardá.
      </p>
      <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2">
        <button
          type="button"
          onClick={onDone}
          className={cx(linkButton, "px-1")}
        >
          Cancelar
        </button>
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
