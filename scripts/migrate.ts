// Applies the pending SQL migrations in src/db/migrations.
// With --production-only (the Vercel build), it does nothing outside the
// production deployment, so preview builds never touch a database.
import "./load-env";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb, createPool } from "@/db/connection";
import { isProduction, migrationDatabaseUrl } from "@/lib/env";

if (process.argv.includes("--production-only") && !isProduction()) {
  console.log("Not a production deployment: migrations skipped.");
} else {
  const pool = createPool(migrationDatabaseUrl());
  try {
    await migrate(createDb(pool), { migrationsFolder: "src/db/migrations" });
    console.log("Migrations applied.");
  } finally {
    await pool.end();
  }
}
