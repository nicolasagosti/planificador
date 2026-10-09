"use client";

import { useId, useState, useTransition, type ReactNode } from "react";
import type { CalendarResult } from "@/app/(app)/clientes/[clientId]/calendarios/calendar-actions";
import { PaperPlaneIcon, UnlockIcon } from "@/components/icons";
import {
  linkButton,
  primaryButton,
  primaryIconButton,
  secondaryButton,
  secondaryIconButton,
} from "@/components/ui/buttons";
import { Dialog } from "@/components/ui/dialog";
import { CALENDAR_REFUSAL_MESSAGES } from "@/domain/calendar-transitions";
import { monthName, type MonthKey } from "@/domain/dates";
import type { CalendarStatus } from "@/domain/statuses";
import { counted } from "@/domain/text";
import { cx } from "@/lib/cx";

type Action = "send" | "approve" | "backToDraft" | "reopen";

/**
 * The calendar's actions next to the month, by state: a draft is sent,
 * deleted or filled from a file; a sent calendar is approved or goes back
 * to draft; an approved one is reopened. Reopening and deleting ask first.
 */
export function CalendarActions({
  month,
  status,
  pieceCount,
  wasApproved,
  transition,
  remove,
  importDialog,
  exportDialog,
}: {
  month: MonthKey;
  status: CalendarStatus;
  pieceCount: number;
  /** A reopened draft: deleting it also deletes the client's approval. */
  wasApproved: boolean;
  transition: (action: Action) => Promise<CalendarResult>;
  remove: () => Promise<CalendarResult>;
  importDialog: ReactNode;
  /** "Exportar para el cliente", in every state. */
  exportDialog: ReactNode;
}) {
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const noteId = useId();

  function run(action: () => Promise<CalendarResult>, onDone?: () => void) {
    setFailure(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) onDone?.();
        else setFailure(result.message);
      } catch {
        setFailure("No pudimos guardar el cambio. Probá de nuevo.");
      }
    });
  }

  const name = monthName(month);
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {status === "draft" && importDialog}
        {exportDialog}
        {status === "draft" && (
          <>
            <Confirm
              trigger="Eliminar calendario"
              triggerClassName={cx(linkButton, "px-2")}
              title={`¿Eliminar el calendario de ${name}?`}
              confirmLabel="Eliminar calendario"
              pendingLabel="Eliminando…"
              pending={pending}
              onConfirm={(close) => run(remove, close)}
            >
              <p>
                {pieceCount === 0
                  ? "No tiene piezas."
                  : `Se borra con sus ${counted(pieceCount, "pieza", "piezas")}.`}{" "}
                No se puede deshacer.
              </p>
              {wasApproved && (
                <p className="font-semibold">
                  El cliente ya lo había aprobado: también se borra esa
                  constancia.
                </p>
              )}
            </Confirm>
            <button
              type="button"
              disabled={pending || pieceCount === 0}
              aria-describedby={pieceCount === 0 ? noteId : undefined}
              onClick={() => run(() => transition("send"))}
              className={cx(
                primaryIconButton,
                "disabled:cursor-not-allowed! disabled:bg-hollow!",
              )}
            >
              <PaperPlaneIcon />
              <span>Marcar como enviado</span>
            </button>
          </>
        )}
        {status === "sent" && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => transition("backToDraft"))}
              className={secondaryButton}
            >
              Volver a borrador
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => transition("approve"))}
              className={primaryButton}
            >
              Marcar como aprobado
            </button>
          </>
        )}
        {status === "approved" && (
          <Confirm
            trigger={
              <>
                <UnlockIcon />
                <span>Reabrir calendario</span>
              </>
            }
            triggerClassName={secondaryIconButton}
            title={`¿Reabrir el calendario de ${name}?`}
            confirmLabel="Reabrir calendario"
            pendingLabel="Reabriendo…"
            pending={pending}
            onConfirm={(close) => run(() => transition("reopen"), close)}
          >
            <p>
              Vuelve a borrador para que puedas cambiar fechas, temas e ideas.
              Las piezas conservan su estado, pero dejan de contar hasta que el
              cliente lo apruebe de nuevo.
            </p>
          </Confirm>
        )}
      </div>
      {status === "draft" && pieceCount === 0 && (
        <p id={noteId} className="text-13 text-muted">
          {CALENDAR_REFUSAL_MESSAGES["no-pieces"]}
        </p>
      )}
      {failure && (
        <p
          role="alert"
          className="max-w-line rounded-button border-[1.5px] border-ink px-3 py-2.5 font-semibold"
        >
          {failure}
        </p>
      )}
    </div>
  );
}

function Confirm({
  trigger,
  triggerClassName,
  title,
  confirmLabel,
  pendingLabel,
  pending,
  onConfirm,
  children,
}: {
  trigger: ReactNode;
  triggerClassName: string;
  title: string;
  confirmLabel: string;
  pendingLabel: string;
  pending: boolean;
  onConfirm: (close: () => void) => void;
  children: ReactNode;
}) {
  return (
    <Dialog title={title} trigger={trigger} triggerClassName={triggerClassName}>
      {(close) => (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">{children}</div>
          <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2">
            <button
              type="button"
              onClick={close}
              className={cx(linkButton, "px-1")}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => onConfirm(close)}
              className={primaryButton}
            >
              {pending ? pendingLabel : confirmLabel}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
