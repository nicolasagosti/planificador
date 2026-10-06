import { expect, test, type Page } from "@playwright/test";

const email = process.env.ADMIN_EMAIL ?? "";
const password = process.env.ADMIN_PASSWORD ?? "";

// Any script or style blocked by the Content Security Policy shows up here.
function collectCspErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /Content Security Policy/i.test(message.text())
    ) {
      errors.push(message.text());
    }
  });
  return errors;
}

async function signIn(page: Page, withPassword: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(withPassword);
  await page.getByRole("button", { name: "Entrar" }).click();
}

// Scoped to main: Next.js adds its own role="alert" route announcer.
const formAlert = (page: Page) => page.getByRole("main").getByRole("alert");

test.beforeAll(() => {
  expect(email, "ADMIN_EMAIL must be set").not.toBe("");
  expect(password, "ADMIN_PASSWORD must be set").not.toBe("");
});

test("sin sesión no se ve nada; con sesión se entra", async ({ page }) => {
  const cspErrors = collectCspErrors(page);

  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Entrá con tu cuenta" }),
  ).toBeVisible();

  await signIn(page, `${password}-incorrecta`);
  await expect(formAlert(page)).toHaveText(
    "El email o la contraseña no son correctos.",
  );
  await expect(page).toHaveURL(/\/login$/);

  await signIn(page, password);
  await expect(page.getByRole("button", { name: "Salir" })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);

  expect(cspErrors).toEqual([]);
});

test("después de entrar vuelve a la página pedida", async ({ page }) => {
  await page.goto("/?mes=2026-11");
  await expect(page).toHaveURL(/\/login\?next=%2F%3Fmes%3D2026-11$/);
  await signIn(page, password);
  await expect(page).toHaveURL(/\/\?mes=2026-11$/);
});

test("frena los intentos de más", async ({ page }) => {
  // Against a deployed app this would lock the real login for a minute.
  test.skip(Boolean(process.env.E2E_BASE_URL), "only against a local build");

  await page.goto("/login");
  const tooMany =
    "Hiciste demasiados intentos. Esperá un minuto y probá de nuevo.";
  for (let attempt = 0; attempt < 6; attempt++) {
    await signIn(page, `${password}-incorrecta`);
    await expect(page.getByRole("button", { name: "Entrar" })).toBeEnabled();
    if ((await formAlert(page).textContent()) === tooMany) break;
  }
  await expect(formAlert(page)).toHaveText(tooMany);
});
