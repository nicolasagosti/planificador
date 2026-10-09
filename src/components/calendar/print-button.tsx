"use client";

import { primaryButton } from "@/components/ui/buttons";

/** Opens the browser's print dialog, where the page can be saved as PDF. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`${primaryButton} print:hidden`}
    >
      Imprimir o guardar como PDF
    </button>
  );
}
