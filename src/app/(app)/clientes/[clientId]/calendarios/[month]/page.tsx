import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CalendarHeading } from "@/components/calendar/calendar-heading";
import { ImportCalendarDialog } from "@/components/calendar/import-calendar-dialog";
import { PlanningCalendar } from "@/components/calendar/planning-calendar";
import { ApprovedCalendar } from "@/components/calendar/approved-calendar";
import { CalendarActions } from "@/components/calendar/calendar-actions";
import { CalendarStatusLine } from "@/components/calendar/calendar-status";
import { primaryButton } from "@/components/ui/buttons";
import { loadCalendar } from "@/db/queries/calendars";
import { findClientOr404 } from "@/db/queries/clients";
import { CALENDAR_PERMISSIONS } from "@/domain/calendar-transitions";
import { isNetwork, sortNetworks } from "@/domain/catalog";
import { monthTitle, type MonthKey } from "@/domain/dates";
import { isSupportedMonth } from "@/domain/month-overview";
import { missingCalendarText } from "@/domain/phrases";
import { requireUser } from "@/server/session";
import { today } from "@/server/today";
import { createCalendar, importCalendar } from "../actions";
import { deleteCalendar, transitionCalendar } from "../calendar-actions";
import {
  deletePiece,
  movePiece,
  savePiece,
  updatePieceAsset,
} from "../piece-actions";

type Props = PageProps<"/clientes/[clientId]/calendarios/[month]">;

async function load(params: Props["params"]) {
  const { clientId, month } = await params;
  if (!isSupportedMonth(month)) notFound();
  const client = await findClientOr404(clientId);
  return { client, month };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { client, month } = await load(params);
  return { title: `${monthTitle(month)} · ${client.name} · Planificador` };
}

// The calendar of a month: an approved one changes the state of its pieces,
// a draft loads and edits them, a sent one shows them read only. The
// selected piece stays in the URL (?pieza=). A month without a calendar
// creates one or imports a file.
export default async function CalendarPage({ params, searchParams }: Props) {
  await requireUser();
  const { client, month } = await load(params);
  const { pieza } = await searchParams;
  const calendar = await loadCalendar(client.id, month);
  const day = today();
  const hrefFor = (target: MonthKey) =>
    `/clientes/${client.id}/calendarios/${target}` as Route;

  // A file can fill a month without a calendar or a draft, unless the
  // client is archived (it gets no new calendars).
  const canImport =
    client.archivedOn === null &&
    (calendar === null || CALENDAR_PERMISSIONS[calendar.status].importFile);
  const defaultNetwork =
    sortNetworks(client.networks).find(isNetwork) ?? "instagram";
  const selectedId = typeof pieza === "string" ? pieza : null;
  const importDialog = canImport && (
    <ImportCalendarDialog
      month={month}
      action={importCalendar.bind(null, client.id, month)}
      defaultNetwork={defaultNetwork}
      existingPieces={calendar?.pieces.length ?? 0}
    />
  );

  return (
    <main className="mx-auto max-w-page px-8 pt-3 pb-18">
      <Breadcrumbs
        items={[
          { label: "Clientes", href: "/" },
          { label: client.name, href: `/clientes/${client.id}` as Route },
          { label: monthTitle(month) },
        ]}
      />
      <CalendarHeading
        month={month}
        hrefFor={hrefFor}
        actions={
          calendar && (
            <CalendarActions
              month={month}
              status={calendar.status}
              pieceCount={calendar.pieces.length}
              wasApproved={calendar.wasApproved}
              transition={transitionCalendar.bind(null, calendar.id)}
              remove={deleteCalendar.bind(null, calendar.id)}
              importDialog={importDialog}
            />
          )
        }
      />

      {calendar ? (
        <>
          <CalendarStatusLine calendar={calendar} day={day} />
          {calendar.status === "approved" && (
            <ApprovedCalendar
              // Another month is another calendar: start from its own state.
              key={calendar.id}
              month={month}
              pieces={calendar.pieces}
              approvedOn={calendar.approvedOn ?? day}
              today={day}
              initialSelectedId={selectedId}
              movePiece={movePiece}
              updatePieceAsset={updatePieceAsset}
            />
          )}
          {calendar.status !== "approved" && (
            <PlanningCalendar
              key={calendar.id}
              month={month}
              status={calendar.status}
              pieces={calendar.pieces}
              today={day}
              initialSelectedId={selectedId}
              defaultNetwork={defaultNetwork}
              savePiece={savePiece.bind(null, calendar.id)}
              deletePiece={deletePiece}
            />
          )}
        </>
      ) : (
        <div className="mt-7 flex flex-col items-start gap-4">
          <p className="max-w-summary text-summary leading-[1.25] font-medium font-stretch-106% tracking-[-0.01em] text-balance">
            {missingCalendarText(client.name, month)}
          </p>
          {/* An archived client gets no new calendars. */}
          {client.archivedOn === null && (
            <div className="flex flex-wrap gap-2">
              <form action={createCalendar.bind(null, client.id)}>
                <input type="hidden" name="month" value={month} />
                <button type="submit" className={primaryButton}>
                  Crear calendario
                </button>
              </form>
              {importDialog}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
