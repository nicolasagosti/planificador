import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

/**
 * A Drizzle client over Neon's WebSocket pool, which supports interactive
 * transactions (the HTTP driver does not). Close it when done.
 */
export function createDb(connectionString: string) {
  const pool = new Pool({ connectionString });
  // An idle connection can drop (for example when Neon suspends the compute).
  // Without a listener that error would crash the process; the pool already
  // discards the broken connection and opens a new one when needed.
  pool.on("error", (error: Error) => {
    console.error("Database connection error:", error.message);
  });
  const db = drizzle({ client: pool, schema, casing: "snake_case" });
  return { db, close: () => pool.end() };
}

export type Db = ReturnType<typeof createDb>["db"];
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
