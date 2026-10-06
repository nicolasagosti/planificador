import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import * as schema from "@/db/schema";
import { authSecret, authUrl } from "@/lib/env";
import { getDb } from "./db";

function createAuth() {
  return betterAuth({
    appName: "Planificador",
    baseURL: authUrl(),
    secret: authSecret(),
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema,
      usePlural: true,
    }),
    advanced: { database: { generateId: "uuid" } },
    // A single user, created with `npm run user:create`: no public sign-up.
    emailAndPassword: { enabled: true, disableSignUp: true },
    // Login attempts are limited per IP. The counters live in Postgres:
    // in memory, each Vercel instance would keep its own count. Only requests
    // to /api/auth are limited, so the login form must go through it.
    rateLimit: {
      enabled: true,
      storage: "database",
      customRules: { "/sign-in/email": { window: 60, max: 5 } },
    },
    telemetry: { enabled: false },
    // Applies cookies set by auth calls in Server Actions (sign-out). Last.
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof createAuth>;
let auth: Auth | undefined;

/** Built on first use, so building the app needs no secrets or database. */
export function getAuth(): Auth {
  auth ??= createAuth();
  return auth;
}
