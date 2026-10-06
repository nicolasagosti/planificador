import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { firstDayOf, type MonthKey } from "@/domain/dates";
import type { ClientOverview } from "@/domain/month-overview";
import type { PieceState } from "@/domain/pieces";
import { idSchema } from "@/domain/schemas";
import { calendarDayIn, type CalendarDay } from "@/domain/today";
import { appTimeZone } from "@/lib/env";
import { getDb } from "@/server/db";
import { requireUser } from "@/server/session";
import { calendars, clients, pieces } from "../schema";

// Every query reads the user from the session and filters by it: calendars
// and pieces reach the user through their client.

function dayOf(instant: Date | null): CalendarDay | null {
  return instant ? calendarDayIn(instant, appTimeZone()) : null;
}

export type MonthClient = ClientOverview & { industry: string | null };

/** Clients not archived, with their calendar of `month` and its pieces. */
export async function loadMonthOverview(
  month: MonthKey,
): Promise<MonthClient[]> {
  const user = await requireUser();
  const db = getDb();

  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      industry: clients.industry,
      calendarId: calendars.id,
      status: calendars.status,
      sentAt: calendars.sentAt,
      approvedAt: calendars.approvedAt,
    })
    .from(clients)
    .leftJoin(
      calendars,
      and(
        eq(calendars.clientId, clients.id),
        eq(calendars.month, firstDayOf(month)),
      ),
    )
    .where(and(eq(clients.userId, user.id), isNull(clients.archivedAt)));

  const calendarIds = rows.flatMap((row) =>
    row.calendarId ? [row.calendarId] : [],
  );
  const pieceRows =
    calendarIds.length === 0
      ? []
      : await db
          .select({
            calendarId: pieces.calendarId,
            date: pieces.date,
            status: pieces.status,
          })
          .from(pieces)
          .innerJoin(calendars, eq(calendars.id, pieces.calendarId))
          .innerJoin(clients, eq(clients.id, calendars.clientId))
          .where(
            and(
              eq(clients.userId, user.id),
              inArray(pieces.calendarId, calendarIds),
            ),
          )
          .orderBy(asc(pieces.date), asc(pieces.createdAt));

  const piecesByCalendar = new Map<string, PieceState[]>();
  for (const piece of pieceRows) {
    const list = piecesByCalendar.get(piece.calendarId) ?? [];
    list.push({ date: piece.date, status: piece.status });
    piecesByCalendar.set(piece.calendarId, list);
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    industry: row.industry,
    archived: false,
    calendar:
      row.calendarId && row.status
        ? {
            status: row.status,
            sentOn: dayOf(row.sentAt),
            approvedOn: dayOf(row.approvedAt),
            pieces: piecesByCalendar.get(row.calendarId) ?? [],
          }
        : null,
  }));
}

export type ClientDetails = {
  id: string;
  name: string;
  industry: string | null;
  contactName: string | null;
  contactPhone: string | null;
  networks: string[];
  approvalNotes: string | null;
  notes: string | null;
  clientSince: CalendarDay | null;
  archivedOn: CalendarDay | null;
};

/** One client of the signed-in user, or null. */
export async function getClient(
  clientId: string,
): Promise<ClientDetails | null> {
  const user = await requireUser();
  const [client] = await getDb()
    .select({
      id: clients.id,
      name: clients.name,
      industry: clients.industry,
      contactName: clients.contactName,
      contactPhone: clients.contactPhone,
      networks: clients.networks,
      approvalNotes: clients.approvalNotes,
      notes: clients.notes,
      clientSince: clients.clientSince,
      archivedAt: clients.archivedAt,
    })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.userId, user.id)));
  if (!client) return null;
  const { archivedAt, ...details } = client;
  return { ...details, archivedOn: dayOf(archivedAt) };
}

/** The client of the signed-in user with this id, or the 404 page. */
export async function findClientOr404(
  clientId: string,
): Promise<ClientDetails> {
  const id = idSchema.safeParse(clientId);
  if (!id.success) notFound();
  const client = await getClient(id.data);
  if (!client) notFound();
  return client;
}

/** Archived clients, the most recently archived first. */
export async function listArchivedClients(): Promise<
  {
    id: string;
    name: string;
    industry: string | null;
    archivedOn: CalendarDay | null;
  }[]
> {
  const user = await requireUser();
  const rows = await getDb()
    .select({
      id: clients.id,
      name: clients.name,
      industry: clients.industry,
      archivedAt: clients.archivedAt,
    })
    .from(clients)
    .where(and(eq(clients.userId, user.id), isNotNull(clients.archivedAt)))
    .orderBy(desc(clients.archivedAt));
  return rows.map(({ archivedAt, ...row }) => ({
    ...row,
    archivedOn: dayOf(archivedAt),
  }));
}
