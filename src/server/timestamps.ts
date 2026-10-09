import "server-only";
import { sql } from "drizzle-orm";
import type { TimestampChange } from "@/domain/calendar-transitions";

/**
 * The value a transition gives a timestamp column: the database's time,
 * null, or undefined to leave it as it is (Drizzle skips undefined).
 */
export function timestampValue(change: TimestampChange) {
  if (change === "now") return sql`now()`;
  if (change === "clear") return null;
  return undefined;
}
