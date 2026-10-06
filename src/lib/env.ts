// Environment variables, validated when read. Each reader is a function so a
// script can load .env files first and nothing fails at import time.
import { z } from "zod";
import { isCalendarDay, isValidTimeZone } from "@/domain/today";

const DEFAULT_TIME_ZONE = "America/Argentina/Buenos_Aires";

// An empty value in an .env file means "not set".
function optional<T extends z.ZodType>(schema: T) {
  return z.preprocess((v) => (v === "" ? undefined : v), schema.optional());
}

function read<T extends z.ZodType>(name: string, schema: T): z.output<T> {
  const result = schema.safeParse(process.env[name]);
  if (!result.success) {
    throw new Error(
      `Invalid environment variable ${name}: ${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}

/** Production is the Vercel production deployment and nothing else. */
export function isProduction(): boolean {
  return process.env.VERCEL_ENV === "production";
}

const postgresUrl = z
  .string()
  .regex(/^postgres(ql)?:\/\//, "must be a postgres:// URL");

export function databaseUrl(): string {
  return read("DATABASE_URL", postgresUrl);
}

/**
 * Migrations prefer the direct (unpooled) connection that the Neon
 * integration adds on Vercel, and fall back to DATABASE_URL.
 */
export function migrationDatabaseUrl(): string {
  return read("DATABASE_URL_UNPOOLED", optional(postgresUrl)) ?? databaseUrl();
}

export function authSecret(): string {
  return read("BETTER_AUTH_SECRET", z.string().min(32));
}

/**
 * Public URL of the app, used by Better Auth for cookies and origin checks.
 * On Vercel it defaults to the project's production domain.
 */
export function authUrl(): string {
  const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!process.env.BETTER_AUTH_URL && productionDomain) {
    return `https://${productionDomain}`;
  }
  return read("BETTER_AUTH_URL", z.url({ protocol: /^https?$/ }));
}

export function appTimeZone(): string {
  return (
    read(
      "APP_TIMEZONE",
      optional(z.string().refine(isValidTimeZone, "unknown time zone")),
    ) ?? DEFAULT_TIME_ZONE
  );
}

export function fakeToday(): string | undefined {
  return read(
    "APP_FAKE_TODAY",
    optional(z.string().refine(isCalendarDay, "must be a YYYY-MM-DD day")),
  );
}

export function adminCredentials(): { email: string; password: string } {
  return {
    email: read("ADMIN_EMAIL", z.email()),
    password: read("ADMIN_PASSWORD", z.string().min(8).max(128)),
  };
}
