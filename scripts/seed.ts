// Loads the development data of docs/SPEC.md (section 10) for the user in
// ADMIN_EMAIL, replacing whatever that user had. Refuses to run in production
// or against a database that has any other user.
import "./load-env";
import { eq, inArray, ne } from "drizzle-orm";
import { createDb } from "@/db/connection";
import { upsertCredentialUser } from "@/db/credential-user";
import {
  calendarEvents,
  calendars,
  clients,
  pieces,
  users,
  type PieceSnapshot,
} from "@/db/schema";
import { seedClients } from "@/db/seed/data";
import { adminCredentials, databaseUrl, isProduction } from "@/lib/env";

// Moments are stored at 15:00 in Buenos Aires so they fall on the intended
// day in the app's time zone.
function at(day: string): Date {
  return new Date(`${day}T15:00:00-03:00`);
}

if (isProduction() || process.env.NODE_ENV === "production") {
  throw new Error("The seed never runs in production.");
}

const { email, password } = adminCredentials();
const { db, close } = createDb(databaseUrl());

try {
  const totals = await db.transaction(async (tx) => {
    const others = await tx
      .select({ id: users.id })
      .from(users)
      .where(ne(users.email, email.trim().toLowerCase()));
    if (others.length > 0) {
      throw new Error(
        `Refusing to seed: the database has ${others.length} user(s) besides ${email}. Is DATABASE_URL the production database?`,
      );
    }

    const { userId } = await upsertCredentialUser(tx, { email, password });

    const ownClients = tx
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.userId, userId));
    await tx.delete(calendars).where(inArray(calendars.clientId, ownClients));
    await tx.delete(clients).where(eq(clients.userId, userId));

    let calendarCount = 0;
    let pieceCount = 0;
    for (const seedClient of seedClients) {
      const [client] = await tx
        .insert(clients)
        .values({
          userId,
          name: seedClient.name,
          industry: seedClient.industry,
          contactName: seedClient.contactName ?? null,
          contactPhone: seedClient.contactPhone ?? null,
          networks: seedClient.networks,
          approvalNotes: seedClient.approvalNotes ?? null,
          notes: seedClient.notes ?? null,
          clientSince: seedClient.clientSince ?? null,
        })
        .returning({ id: clients.id });
      if (!client) throw new Error(`Could not create ${seedClient.name}`);

      for (const seedCalendar of seedClient.calendars) {
        const [calendar] = await tx
          .insert(calendars)
          .values({
            clientId: client.id,
            month: seedCalendar.month,
            status: seedCalendar.status,
            sentAt: seedCalendar.sentOn ? at(seedCalendar.sentOn) : null,
            approvedAt: seedCalendar.approvedOn
              ? at(seedCalendar.approvedOn)
              : null,
          })
          .returning({ id: calendars.id });
        if (!calendar) throw new Error(`Could not create a calendar`);
        calendarCount += 1;

        const inserted = await tx
          .insert(pieces)
          .values(
            seedCalendar.pieces.map((piece) => ({
              calendarId: calendar.id,
              date: piece.date,
              network: piece.network,
              format: piece.format,
              topic: piece.topic,
              idea: piece.idea ?? null,
              status: piece.status,
              doneAt: piece.doneOn ? at(piece.doneOn) : null,
              deliveredAt: piece.deliveredOn ? at(piece.deliveredOn) : null,
              assetUrl: piece.asset?.url ?? null,
              assetName: piece.asset?.name ?? null,
            })),
          )
          .returning();
        pieceCount += inserted.length;

        if (seedCalendar.sentOn) {
          const sentAt = at(seedCalendar.sentOn);
          await tx.insert(calendarEvents).values({
            calendarId: calendar.id,
            type: "sent",
            createdAt: sentAt,
            updatedAt: sentAt,
          });
        }
        if (seedCalendar.approvedOn) {
          const approvedAt = at(seedCalendar.approvedOn);
          // Every piece was pending when the client approved.
          const snapshot: PieceSnapshot[] = inserted.map((piece) => ({
            id: piece.id,
            date: piece.date,
            network: piece.network,
            format: piece.format,
            topic: piece.topic,
            idea: piece.idea,
            status: "pending",
          }));
          await tx.insert(calendarEvents).values({
            calendarId: calendar.id,
            type: "approved",
            snapshot,
            createdAt: approvedAt,
            updatedAt: approvedAt,
          });
        }
      }
    }
    return {
      clients: seedClients.length,
      calendars: calendarCount,
      pieces: pieceCount,
    };
  });

  console.log(
    `Seeded ${totals.clients} clients, ${totals.calendars} calendars and ${totals.pieces} pieces for ${email}.`,
  );
} finally {
  await close();
}
