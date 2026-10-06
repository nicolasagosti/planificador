import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { firstDayOf, type MonthKey } from "@/domain/dates";
import type { CalendarStatus, PieceStatus } from "@/domain/statuses";
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

export type CalendarPiece = {
  id: string;
  date: CalendarDay;
  status: PieceStatus;
  network: string;
  format: string;
  topic: string;
  idea: string | null;
  doneOn: CalendarDay | null;
  deliveredOn: CalendarDay | null;
  assetUrl: string | null;
  assetName: string | null;
};

export type ClientCalendar = {
  id: string;
  /** "YYYY-MM" */
  month: MonthKey;
  status: CalendarStatus;
  sentOn: CalendarDay | null;
  approvedOn: CalendarDay | null;
  /** By day; pieces of the same day in the order they were created. */
  pieces: CalendarPiece[];
};

async function piecesOf(
  userId: string,
  calendarIds: string[],
): Promise<Map<string, CalendarPiece[]>> {
  const byCalendar = new Map<string, CalendarPiece[]>();
  if (calendarIds.length === 0) return byCalendar;
  const rows = await getDb()
    .select({
      id: pieces.id,
      calendarId: pieces.calendarId,
      date: pieces.date,
      status: pieces.status,
      network: pieces.network,
      format: pieces.format,
      topic: pieces.topic,
      idea: pieces.idea,
      doneAt: pieces.doneAt,
      deliveredAt: pieces.deliveredAt,
      assetUrl: pieces.assetUrl,
      assetName: pieces.assetName,
    })
    .from(pieces)
    .innerJoin(calendars, eq(calendars.id, pieces.calendarId))
    .innerJoin(clients, eq(clients.id, calendars.clientId))
    .where(
      and(eq(clients.userId, userId), inArray(pieces.calendarId, calendarIds)),
    )
    .orderBy(asc(pieces.date), asc(pieces.createdAt), asc(pieces.id));
  for (const { calendarId, doneAt, deliveredAt, ...piece } of rows) {
    const list = byCalendar.get(calendarId) ?? [];
    list.push({
      ...piece,
      doneOn: dayOf(doneAt),
      deliveredOn: dayOf(deliveredAt),
    });
    byCalendar.set(calendarId, list);
  }
  return byCalendar;
}

/** All calendars of a client, the newest month first, with their pieces. */
export async function loadClientCalendars(
  clientId: string,
): Promise<ClientCalendar[]> {
  const user = await requireUser();
  const rows = await getDb()
    .select({
      id: calendars.id,
      month: calendars.month,
      status: calendars.status,
      sentAt: calendars.sentAt,
      approvedAt: calendars.approvedAt,
    })
    .from(calendars)
    .innerJoin(clients, eq(clients.id, calendars.clientId))
    .where(and(eq(clients.id, clientId), eq(clients.userId, user.id)))
    .orderBy(desc(calendars.month));
  const byCalendar = await piecesOf(
    user.id,
    rows.map((row) => row.id),
  );
  return rows.map((row) => ({
    id: row.id,
    month: row.month.slice(0, 7),
    status: row.status,
    sentOn: dayOf(row.sentAt),
    approvedOn: dayOf(row.approvedAt),
    pieces: byCalendar.get(row.id) ?? [],
  }));
}

/** The client's calendar of `month`, or null if there is none. */
export async function loadCalendar(
  clientId: string,
  month: MonthKey,
): Promise<ClientCalendar | null> {
  const user = await requireUser();
  const [row] = await getDb()
    .select({
      id: calendars.id,
      status: calendars.status,
      sentAt: calendars.sentAt,
      approvedAt: calendars.approvedAt,
    })
    .from(calendars)
    .innerJoin(clients, eq(clients.id, calendars.clientId))
    .where(
      and(
        eq(clients.id, clientId),
        eq(clients.userId, user.id),
        eq(calendars.month, firstDayOf(month)),
      ),
    );
  if (!row) return null;
  const byCalendar = await piecesOf(user.id, [row.id]);
  return {
    id: row.id,
    month,
    status: row.status,
    sentOn: dayOf(row.sentAt),
    approvedOn: dayOf(row.approvedAt),
    pieces: byCalendar.get(row.id) ?? [],
  };
}
