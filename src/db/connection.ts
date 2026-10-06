import net from "node:net";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Neon's host resolves to several IPv4 and IPv6 addresses, and Node gives each
// connection attempt 250 ms before trying the next one. From a slow network
// (or one without IPv6) every attempt can run out and the query fails at
// random. One second per attempt fixes it; next to the database, on Vercel,
// connecting takes a few milliseconds and nothing changes.
net.setDefaultAutoSelectFamilyAttemptTimeout(1_000);

/**
 * A node-postgres pool: plain Postgres over TCP, which Neon recommends for
 * Vercel Functions with Fluid compute and which supports transactions.
 */
export function createPool(connectionString: string): Pool {
  const url = new URL(connectionString);
  // pg treats sslmode=require as verify-full (certificate checked) but will
  // weaken it in its next major version. Ask for verify-full explicitly.
  if (url.searchParams.get("sslmode") === "require") {
    url.searchParams.set("sslmode", "verify-full");
  }
  const pool = new Pool({ connectionString: url.toString() });
  // An idle connection can drop (for example when Neon suspends the compute).
  // Without a listener that error would crash the process; the pool already
  // discards the broken connection and opens a new one when needed.
  pool.on("error", (error: Error) => {
    console.error("Database connection error:", error.message);
  });
  return pool;
}

export function createDb(pool: Pool) {
  return drizzle({ client: pool, schema, casing: "snake_case" });
}

export type Db = ReturnType<typeof createDb>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
