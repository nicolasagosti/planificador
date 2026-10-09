// Exporting a calendar for the client (docs/SPEC.md, section 5): the printable
// view and the Excel file have the same columns, one row per piece by day.
import { formatLabel, networkName } from "./catalog";
import type { MonthKey } from "./dates";
import { byDate, type PieceState } from "./pieces";
import type { CalendarDay } from "./today";

export const EXPORT_COLUMNS = [
  "Fecha",
  "Red",
  "Formato",
  "Tema",
  "Idea",
] as const;

export type ExportRow = {
  date: CalendarDay;
  network: string;
  format: string;
  topic: string;
  idea: string;
};

/** The pieces as the client reads them, by day. */
export function exportRows(
  pieces: readonly (PieceState & {
    network: string;
    format: string;
    topic: string;
    idea: string | null;
  })[],
): ExportRow[] {
  return byDate(pieces).map((piece) => ({
    date: piece.date,
    network: networkName(piece.network),
    format: formatLabel(piece.format),
    topic: piece.topic,
    idea: piece.idea ?? "",
  }));
}

/** "Café Lumbre" in October 2026: "calendario-cafe-lumbre-2026-10.xlsx" */
export function exportFileName(clientName: string, month: MonthKey): string {
  const slug = clientName
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `calendario-${slug || "cliente"}-${month}.xlsx`;
}
