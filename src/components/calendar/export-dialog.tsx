"use client";

import { DownloadIcon } from "@/components/icons";
import {
  linkButton,
  primaryButton,
  secondaryButton,
  secondaryIconButton,
} from "@/components/ui/buttons";
import { Dialog } from "@/components/ui/dialog";
import { cx } from "@/lib/cx";

/**
 * "Exportar para el cliente": the printable view, which the browser prints
 * or saves as PDF, or the Excel file. Any state of the calendar.
 */
export function ExportDialog({
  printHref,
  excelHref,
  fileName,
}: {
  printHref: string;
  excelHref: string;
  fileName: string;
}) {
  return (
    <Dialog
      title="Exportar para el cliente"
      triggerClassName={secondaryIconButton}
      trigger={
        <>
          <DownloadIcon />
          <span>Exportar para el cliente</span>
        </>
      }
    >
      {(close) => (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <a
              href={printHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className={primaryButton}
            >
              Abrir para imprimir o guardar como PDF
            </a>
            <p className="text-13 text-muted">
              Se abre en otra pestaña, en una hoja A4 apaisada.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <a
              href={excelHref}
              download={fileName}
              onClick={close}
              className={secondaryButton}
            >
              Descargar el Excel
            </a>
            <p className="text-13 text-muted">{fileName}</p>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={close}
              className={cx(linkButton, "px-1")}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
