import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { isAllowedEmail } from "@/lib/access";
import {
  allowedEmail,
  authSecret,
  authUrl,
  googleCredentials,
  isProduction,
} from "@/lib/env";
import { getDb } from "./db";

function createAuth() {
  const production = isProduction();
  const google = googleCredentials();
  if (production && !google) {
    throw new Error(
      "Production signs in with Google: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
    );
  }
  const onlyUser = allowedEmail();

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
    // The user signs in with Google. Email and password exist only outside
    // production, for development and the end-to-end tests (Google's login
    // cannot be automated).
    socialProviders: google
      ? { google: { ...google, prompt: "select_account" } }
      : {},
    emailAndPassword: { enabled: !production, disableSignUp: true },
    // A single user: only the ADMIN_EMAIL account can be created (its first
    // Google sign-in creates it) and only that account can open a session.
    databaseHooks: {
      user: {
        create: {
          before: async (user) => isAllowedEmail(user.email, onlyUser),
        },
      },
      session: {
        create: {
          before: async (session) => {
            const [owner] = await getDb()
              .select({ email: schema.users.email })
              .from(schema.users)
              .where(eq(schema.users.id, session.userId));
            return isAllowedEmail(owner?.email, onlyUser);
          },
        },
      },
    },
    // Sign-in attempts are limited per IP. The counters live in Postgres: in
    // memory, each Vercel instance would keep its own count. Only requests to
    // /api/auth are limited, so the login screen must go through it.
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
