import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/calendar/print-button";
import { loadCalendar } from "@/db/queries/calendars";
import { findClientOr404 } from "@/db/queries/clients";
import { monthTitle, shortDay } from "@/domain/dates";
import { EXPORT_COLUMNS, exportRows } from "@/domain/export";
import { isSupportedMonth } from "@/domain/month-overview";
import { requireUser } from "@/server/session";

type Props = PageProps<"/clientes/[clientId]/calendarios/[month]/imprimir">;

async function load(params: Props["params"]) {
  const { clientId, month } = await params;
  if (!isSupportedMonth(month)) notFound();
  const client = await findClientOr404(clientId);
  return { client, month };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { client, month } = await load(params);
  return { title: `${client.name} · ${monthTitle(month)}` };
}

// The calendar for the client, on an A4 sheet in landscape (docs/SPEC.md,
// section 5): the client, the month and its pieces, without the app's bar or
// buttons. Any state of the calendar can be printed.
export default async function PrintCalendarPage({ params }: Props) {
  await requireUser();
  const { client, month } = await load(params);
  const calendar = await loadCalendar(client.id, month);
  if (!calendar) notFound();
  const rows = exportRows(calendar.pieces);

  return (
    <main className="mx-auto max-w-[297mm] bg-surface px-8 py-8 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div>
          <h1 className="text-headline leading-[1.1] font-bold font-stretch-110% tracking-[-0.02em] print:text-[24pt]">
            {client.name}
          </h1>
          <p className="mt-1 text-18 font-medium text-muted">
            Calendario de contenido de {monthTitle(month).toLowerCase()}
          </p>
        </div>
        <PrintButton />
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-muted">
          Todavía no hay piezas en este calendario.
        </p>
      ) : (
        <table className="mt-7 w-full border-collapse text-14 print:text-[10pt]">
          <thead>
            <tr className="border-b-[1.5px] border-ink text-left">
              {EXPORT_COLUMNS.map((title) => (
                <th
                  key={title}
                  scope="col"
                  className="px-2 py-2 text-13 font-semibold text-muted first:pl-0 print:text-[9pt]"
                >
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                className="break-inside-avoid border-b border-line align-top"
              >
                <td className="py-2.5 print:py-1.5 pr-2 font-semibold whitespace-nowrap tabular-nums">
                  {shortDay(row.date)}
                </td>
                <td className="px-2 py-2.5 print:py-1.5 whitespace-nowrap">
                  {row.network}
                </td>
                <td className="px-2 py-2.5 print:py-1.5 whitespace-nowrap">
                  {row.format}
                </td>
                <td className="w-[28%] px-2 py-2.5 print:py-1.5 font-semibold">
                  {row.topic}
                </td>
                <td className="px-2 py-2.5 print:py-1.5 whitespace-pre-line text-muted print:text-ink">
                  {row.idea}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
