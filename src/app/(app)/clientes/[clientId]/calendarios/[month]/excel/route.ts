import writeXlsxFile, { type SheetData } from "write-excel-file/node";
import { loadCalendar } from "@/db/queries/calendars";
import { getClient } from "@/db/queries/clients";
import { monthTitle } from "@/domain/dates";
import { EXPORT_COLUMNS, exportFileName, exportRows } from "@/domain/export";
import { isSupportedMonth } from "@/domain/month-overview";
import { idSchema } from "@/domain/schemas";
import { requireUser } from "@/server/session";

// The calendar of a month as an Excel file for the client (docs/SPEC.md,
// section 5): the columns of the printable view, one row per piece. It has
// the headers the import reads, so the file can come back into the app.
export async function GET(
  _request: Request,
  context: RouteContext<"/clientes/[clientId]/calendarios/[month]/excel">,
) {
  await requireUser();
  const { clientId, month } = await context.params;
  const id = idSchema.safeParse(clientId);
  if (!id.success || !isSupportedMonth(month)) {
    return new Response("No encontramos ese calendario.", { status: 404 });
  }
  const client = await getClient(id.data);
  const calendar = client ? await loadCalendar(client.id, month) : null;
  if (!client || !calendar) {
    return new Response("No encontramos ese calendario.", { status: 404 });
  }

  const header = EXPORT_COLUMNS.map((title) => ({
    value: title,
    fontWeight: "bold" as const,
  }));
  const rows: SheetData = exportRows(calendar.pieces).map((row) => {
    // A calendar day has no time zone: midnight UTC is that day in Excel.
    const [year = 0, monthNumber = 1, day = 1] = row.date
      .split("-")
      .map(Number);
    return [
      {
        value: new Date(Date.UTC(year, monthNumber - 1, day)),
        format: "dd/mm/yyyy",
      },
      row.network,
      row.format,
      { value: row.topic, wrap: true },
      { value: row.idea, wrap: true },
    ];
  });

  const file = await writeXlsxFile([header, ...rows], {
    sheet: monthTitle(month),
    orientation: "landscape",
    columns: [
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 40 },
      { width: 70 },
    ],
  }).toBuffer();

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${exportFileName(client.name, month)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
