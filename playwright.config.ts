import { createRequire } from "node:module";
import { defineConfig, devices } from "@playwright/test";

// Loads .env.local the way Next.js does (ADMIN_EMAIL and ADMIN_PASSWORD are
// the credentials the tests sign in with).
const requireCommonJs = createRequire(import.meta.url);
(requireCommonJs("@next/env") as typeof import("@next/env")).loadEnvConfig(
  process.cwd(),
);

// Locally the tests run against a production build on its own port. Set
// E2E_BASE_URL to run them against a deployed app instead.
const PORT = 3100;
const localUrl = `http://localhost:${PORT}`;
const baseURL = process.env.E2E_BASE_URL ?? localUrl;

// The login attempt limit counts per client IP. Each local run signs in from
// its own made-up address (TEST-NET-2), so consecutive runs do not lock each
// other out. On Vercel the header is replaced with the real address.
const runAddress = `198.51.100.${1 + Math.floor(Math.random() * 254)}`;

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    extraHTTPHeaders: { "x-forwarded-for": runAddress },
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run build && npx next start -p ${PORT}`,
        url: `${localUrl}/login`,
        reuseExistingServer: false,
        timeout: 180_000,
        env: { BETTER_AUTH_URL: localUrl },
      },
});
