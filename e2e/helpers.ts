import { expect, type Page } from "@playwright/test";

export const email = process.env.ADMIN_EMAIL ?? "";
export const password = process.env.ADMIN_PASSWORD ?? "";

/** Production has no email-and-password login: those tests run locally. */
export const againstDeployedApp = Boolean(process.env.E2E_BASE_URL);

/** The development user's session, saved by auth.setup.ts (not in git). */
export const STORAGE_STATE = "playwright/.auth/user.json";

export async function fillPasswordLogin(page: Page, withPassword: string) {
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(withPassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

/** Signs in with the development user and waits to leave /login. */
export async function signIn(page: Page) {
  await page.goto("/login");
  await fillPasswordLogin(page, password);
  // The first sign-in of a run starts everything cold (auth, the database
  // connection, the password hash), which can take several seconds.
  await expect(page.getByRole("button", { name: "Salir" })).toBeVisible({
    timeout: 20_000,
  });
}

/** Alerts of the page's own content (Next.js adds a route announcer). */
export const formAlert = (page: Page) =>
  page.getByRole("main").getByRole("alert");
