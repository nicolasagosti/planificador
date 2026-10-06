// Applies the pending SQL migrations in src/db/migrations to DATABASE_URL.
import "./load-env";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { createDb } from "@/db/connection";
import { databaseUrl } from "@/lib/env";

const { db, close } = createDb(databaseUrl());
try {
  await migrate(db, { migrationsFolder: "src/db/migrations" });
  console.log("Migrations applied.");
} finally {
  await close();
}
