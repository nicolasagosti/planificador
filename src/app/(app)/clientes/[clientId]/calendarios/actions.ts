"use server";

import { and, eq, isNull } from "drizzle-orm";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { calendars, clients } from "@/db/schema";
import { firstDayOf } from "@/domain/dates";
import { isSupportedMonth } from "@/domain/month-overview";
import { idSchema } from "@/domain/schemas";
import { getDb } from "@/server/db";
import { requireUser } from "@/server/session";

/**
 * Creates the client's calendar of the month in the form (a draft) and
 * opens it. If that month already has one, it just opens it. Archived
 * clients get no new calendars.
 */
export async function createCalendar(
  clientId: string,
  formData: FormData,
): Promise<void> {
  const user = await requireUser();
  const id = idSchema.safeParse(clientId);
  const month = formData.get("month");
  if (!id.success || !isSupportedMonth(month)) notFound();

  const db = getDb();
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(
        eq(clients.id, id.data),
        eq(clients.userId, user.id),
        isNull(clients.archivedAt),
      ),
    );
  if (!client) notFound();

  await db
    .insert(calendars)
    .values({ clientId: client.id, month: firstDayOf(month) })
    .onConflictDoNothing({ target: [calendars.clientId, calendars.month] });

  revalidatePath("/");
  revalidatePath(`/clientes/${client.id}`);
  redirect(`/clientes/${client.id}/calendarios/${month}` as Route);
}
