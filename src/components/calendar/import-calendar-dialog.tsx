"use client";

import { useId, useRef, useState, useTransition } from "react";
import type { ImportResult } from "@/app/(app)/clientes/[clientId]/calendarios/actions";
import { UploadIcon } from "@/components/icons";
import { PieceStateLabel } from "@/components/status/piece-state-label";
import {
  linkButton,
  primaryButton,
  secondaryIconButton,
} from "@/components/ui/buttons";
import { Dialog } from "@/components/ui/dialog";
import { fieldClass, labelClass } from "@/components/ui/fields";
import {
  IMPORT_LIMITS,
  NO_TABLE_TEXT,
  importButtonText,
  importFoundText,
  missingNetworkText,
  otherMonthsText,
  problemsTitle,
  readCalendarImport,
  replaceText,
  tooManyPiecesText,
  type CalendarImport,
} from "@/domain/calendar-import";
import {
  NETWORK_LABELS,
  NETWORKS,
  formatOnNetwork,
  type Network,
} from "@/domain/catalog";
import { monthName, shortDay, type MonthKey } from "@/domain/dates";
import { STATUS_NAMES } from "@/domain/phrases";
import type { CalendarImportInput } from "@/domain/schemas";
import {
  CALENDAR_FILE_ACCEPT,
  CalendarFileError,
  readCalendarFile,
} from "@/lib/calendar-file";
import { cx } from "@/lib/cx";

type Props = {
  month: MonthKey;
  /** The Server Action, with the client and the month bound. */
  action: (input: CalendarImportInput) => Promise<ImportResult>;
  /** For pieces whose network the file does not say. */
  defaultNetwork: Network;
  /** Pieces the draft has now, which the import replaces. */
  existingPieces: number;
};

/**
 * "Importar Excel o HTML": reads the file in the browser, shows what it
 * found and, once confirmed, sends the pieces to the server.
 */
export function ImportCalendarDialog(props: Props) {
  return (
    <Dialog
      title="Importar Excel o HTML"
      wide
      triggerClassName={secondaryIconButton}
      trigger={
        <>
          <UploadIcon />
          <span>Importar Excel o HTML</span>
        </>
      }
    >
      {(close) => <ImportForm {...props} onClose={close} />}
    </Dialog>
  );
}

type Reading =
  | { status: "idle" }
  | { status: "reading" }
  | { status: "failed"; message: string }
  | { status: "read"; result: CalendarImport; attempt: number };

function ImportForm({
  month,
  action,
  defaultNetwork,
  existingPieces,
  onClose,
}: Props & { onClose: () => void }) {
  const fileId = useId();
  const hintId = useId();
  const [reading, setReading] = useState<Reading>({ status: "idle" });
  // Only the last file chosen counts, if another one is chosen while reading.
  const lastFile = useRef(0);

  async function read(file: File | undefined) {
    const attempt = ++lastFile.current;
    if (!file) {
      setReading({ status: "idle" });
      return;
    }
    setReading({ status: "reading" });
    let next: Reading;
    try {
      const result = readCalendarImport(await readCalendarFile(file), month);
      next = result
        ? { status: "read", result, attempt }
        : { status: "failed", message: NO_TABLE_TEXT };
    } catch (error) {
      next = {
        status: "failed",
        message:
          error instanceof CalendarFileError
            ? error.message
            : "No pudimos leer el archivo. Probá de nuevo.",
      };
    }
    if (attempt === lastFile.current) setReading(next);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={fileId} className={labelClass}>
          Archivo
        </label>
        <input
          id={fileId}
          type="file"
          accept={CALENDAR_FILE_ACCEPT}
          aria-describedby={hintId}
          autoFocus
          onChange={(event) => void read(event.currentTarget.files?.[0])}
          className="min-h-11 text-15 file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-button file:border-[1.5px] file:border-ink file:bg-surface file:px-4 file:font-semibold file:text-ink hover:file:bg-row-hover"
        />
        <p id={hintId} className="text-13 text-muted">
          Un Excel (.xlsx) o una página web (.html) con el calendario. Se
          importan las piezas de {monthName(month)}.
        </p>
      </div>

      {reading.status === "reading" && (
        <p role="status" className="font-semibold">
          Leyendo el archivo…
        </p>
      )}
      {reading.status === "failed" && <Notice>{reading.message}</Notice>}
      {reading.status === "read" ? (
        <Preview
          // A new file starts a new preview, with its own choices.
          key={reading.attempt}
          result={reading.result}
          month={month}
          action={action}
          defaultNetwork={defaultNetwork}
          existingPieces={existingPieces}
          onClose={onClose}
        />
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`${linkButton} px-1`}
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

function Preview({
  result,
  month,
  action,
  defaultNetwork,
  existingPieces,
  onClose,
}: Props & { result: CalendarImport; onClose: () => void }) {
  const networkId = useId();
  const [network, setNetwork] = useState<Network>(defaultNetwork);
  const [approved, setApproved] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const { pieces, problems } = result;
  const withoutNetwork = pieces.filter((piece) => piece.network === null);
  const tooMany = pieces.length > IMPORT_LIMITS.pieces;
  const others = otherMonthsText(result.otherMonths);
  const replacing = replaceText(existingPieces);

  function submit() {
    setFailure(null);
    startTransition(async () => {
      try {
        const outcome = await action({
          approved,
          pieces: pieces.map((piece) => ({
            ...piece,
            network: piece.network ?? network,
          })),
        });
        if (outcome.ok) onClose();
        else setFailure(outcome.message);
      } catch {
        setFailure("No pudimos importar el calendario. Probá de nuevo.");
      }
    });
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <p role="status" className="text-17 font-semibold">
          {importFoundText(pieces.length, month)}
        </p>
        {others && <p className="text-muted">{others}</p>}
      </div>

      {problems.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="font-semibold">{problemsTitle(problems.length)}</p>
          <ul className="flex flex-col gap-1.5 border-l-[1.5px] border-ink pl-3">
            {problems.map((problem, index) => (
              <li key={index}>
                <span className="font-semibold">{problem.row}.</span>{" "}
                {problem.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tooMany && <Notice>{tooManyPiecesText(month)}</Notice>}

      {pieces.length > 0 && !tooMany && (
        <>
          <PiecesTable result={result} network={network} />

          {withoutNetwork.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={networkId} className={labelClass}>
                {missingNetworkText(withoutNetwork.length)} ¿En qué red{" "}
                {withoutNetwork.length === 1 ? "va" : "van"}?
              </label>
              <select
                id={networkId}
                value={network}
                onChange={(event) =>
                  setNetwork(event.currentTarget.value as Network)
                }
                className={cx(fieldClass, "sm:max-w-64")}
              >
                {NETWORKS.map((code) => (
                  <option key={code} value={code}>
                    {NETWORK_LABELS[code].name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 font-semibold">
              <input
                type="checkbox"
                checked={approved}
                onChange={(event) => setApproved(event.currentTarget.checked)}
                className="size-[18px] accent-ink"
              />
              El cliente ya lo aprobó
            </label>
            <p className="text-13 text-muted">
              {approved
                ? "Entra aprobado con fecha de hoy y sus piezas empiezan a contar, cada una en el estado que dice el archivo."
                : "Entra en borrador: lo enviás y lo aprobás desde el calendario."}
            </p>
          </div>

          {replacing && <p className="font-semibold">{replacing}</p>}
        </>
      )}

      {failure && <Notice alert>{failure}</Notice>}

      <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2">
        <button
          type="button"
          onClick={onClose}
          className={`${linkButton} px-1`}
        >
          Cancelar
        </button>
        {pieces.length > 0 && !tooMany && (
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className={primaryButton}
          >
            {pending ? "Importando…" : importButtonText(pieces.length)}
          </button>
        )}
      </div>
    </>
  );
}

const columns =
  "grid grid-cols-[88px_160px_minmax(0,1fr)_120px] items-start gap-x-4";

/** The pieces as they will be saved, by day. */
function PiecesTable({
  result,
  network,
}: {
  result: CalendarImport;
  network: Network;
}) {
  const captionId = useId();
  return (
    <div className="overflow-x-auto">
      <p id={captionId} className="sr-only">
        Piezas que se importan
      </p>
      <div
        role="table"
        aria-labelledby={captionId}
        className="min-w-[600px] border-t-[1.5px] border-ink text-15"
      >
        <div role="rowgroup">
          <div
            role="row"
            className={cx(columns, "border-b border-line px-2 py-2")}
          >
            {["Fecha", "Pieza", "Tema", "Estado"].map((title) => (
              <div
                key={title}
                role="columnheader"
                className="text-13 font-semibold text-muted"
              >
                {title}
              </div>
            ))}
          </div>
        </div>
        <div role="rowgroup">
          {result.pieces.map((piece, index) => (
            <div
              key={index}
              role="row"
              className={cx(columns, "border-b border-line px-2 py-2.5")}
            >
              <div role="cell" className="font-semibold">
                {shortDay(piece.date)}
              </div>
              <div role="cell" className="text-muted">
                {formatOnNetwork(piece.format, piece.network ?? network)}
              </div>
              <div role="cell" className="min-w-0">
                <span className="font-semibold">{piece.topic}</span>
                {piece.idea && (
                  <span className="mt-0.5 line-clamp-2 text-13 whitespace-pre-line text-muted">
                    {piece.idea}
                  </span>
                )}
              </div>
              <div role="cell">
                <PieceStateLabel
                  text={STATUS_NAMES[piece.status]}
                  square={piece.status}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** A message in a box with an ink border: red means "overdue" only. */
function Notice({
  children,
  alert = false,
}: {
  children: string;
  alert?: boolean;
}) {
  return (
    <p
      role={alert ? "alert" : undefined}
      className="rounded-button border-[1.5px] border-ink px-3 py-2.5 font-semibold"
    >
      {children}
    </p>
  );
}
