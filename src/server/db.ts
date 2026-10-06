import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { createDb, createPool, type Db } from "@/db/connection";
import { databaseUrl } from "@/lib/env";

// One pool per server instance, created on first use so that building the app
// never needs the database. On Vercel, attachDatabasePool closes idle
// connections before the function suspends. The global survives hot reloads
// in development, which would otherwise open a new pool on every edit.
const cache = globalThis as unknown as { planificadorDb?: Db };

export function getDb(): Db {
  if (!cache.planificadorDb) {
    const pool = createPool(databaseUrl());
    attachDatabasePool(pool);
    cache.planificadorDb = createDb(pool);
  }
  return cache.planificadorDb;
}
