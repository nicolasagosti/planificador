import { expect, test, type Page } from "@playwright/test";
import { againstDeployedApp, STORAGE_STATE } from "./helpers";

// The Clientes screen on the seed data, with "today" on 5 October 2026.
test.skip(againstDeployedApp, "uses the seed data and the password login");

test.use({ storageState: STORAGE_STATE });

/** The client names of the table, in order. */
function clientNames(page: Page) {
  return page
    .getByRole("table")
    .getByRole("row")
    .getByRole("link")
    .allTextContents();
}

test("la pantalla Clientes da los números del mes", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Debés 25 piezas, tenés 9 hechas sin entregar y ya entregaste 13.",
  );
  await expect(page.getByRole("main")).toContainText(
    "3 están atrasadas: 2 de Óptica Mirador y 1 de Café Lumbre.",
  );
  await expect(page.getByRole("main")).toContainText(
    "No cuentan todavía: 8 piezas de Estudio Pampa, que tiene el calendario sin aprobar, y 6 de Impulso Funcional, que sigue en borrador.",
  );
  expect(await clientNames(page)).toEqual([
    "Óptica Mirador",
    "Café Lumbre",
    "Vivero Las Lilas",
    "Panadería La Espiga",
    "Estudio Pampa",
    "Impulso Funcional",
  ]);
  await expect(
    page.getByRole("img", {
      name: "15 piezas: 3 entregadas, 2 hechas y 10 pendientes, 1 de ellas atrasada",
    }),
  ).toBeVisible();
});

test("los filtros muestran sus clientes", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Con atrasos (2)" }).click();
  expect(await clientNames(page)).toEqual(["Óptica Mirador", "Café Lumbre"]);
  await page.getByRole("button", { name: "Esperando aprobación (1)" }).click();
  expect(await clientNames(page)).toEqual(["Estudio Pampa"]);
  await page.getByRole("button", { name: "En borrador (1)" }).click();
  expect(await clientNames(page)).toEqual(["Impulso Funcional"]);
  await expect(
    page.getByRole("button", { name: "En borrador (1)" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Todos (6)" }).click();
  expect(await clientNames(page)).toHaveLength(6);
});

test("el selector de mes cambia de mes", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Mes siguiente" }).click();
  await expect(page).toHaveURL(/\/\?mes=2026-11$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Todavía no tenés calendarios aprobados en noviembre.",
  );
  await expect(page.getByRole("main")).toContainText(
    "No cuentan todavía: 4 piezas de Café Lumbre, que sigue en borrador.",
  );
  await page.getByRole("link", { name: "Mes anterior" }).click();
  await expect(page).toHaveURL(/\/\?mes=2026-10$/);
});

test("crear y editar un cliente", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Nuevo cliente" }).click();
  const create = page.getByRole("dialog", { name: "Nuevo cliente" });

  await create.getByRole("button", { name: "Crear cliente" }).click();
  await expect(
    create.getByText("Escribí el nombre del cliente."),
  ).toBeVisible();

  await create.getByLabel("Nombre").fill("Prueba E2E");
  await create.getByLabel("Rubro").fill("Librería");
  await create.getByLabel("Contacto").fill("Ana Paz");
  await create.getByLabel("WhatsApp").fill("11 5555-0000");
  await create.getByLabel("Instagram").check();
  await create.getByLabel("Mes").selectOption({ label: "marzo" });
  await create.getByLabel("Año").selectOption("2026");
  await create.getByRole("button", { name: "Crear cliente" }).click();

  await expect(page).toHaveURL(/\/clientes\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Prueba E2E",
  );
  await expect(page.getByRole("main")).toContainText(
    "Librería. Cliente desde marzo de 2026.",
  );

  await page.getByRole("button", { name: "Editar datos" }).click();
  const edit = page.getByRole("dialog", { name: "Editar datos" });
  await expect(edit.getByLabel("Nombre")).toHaveValue("Prueba E2E");
  await expect(edit.getByLabel("Instagram")).toBeChecked();
  await edit.getByLabel("Rubro").fill("Librería y café");
  await edit.getByLabel("Facebook").check();
  await edit.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(edit).toBeHidden();
  await expect(page.getByRole("main")).toContainText(
    "Librería y café. Cliente desde marzo de 2026.",
  );
  await expect(page.getByRole("main")).toContainText("Instagram y Facebook");

  await page.getByRole("link", { name: "Clientes" }).click();
  const row = page.getByRole("row").filter({ hasText: "Prueba E2E" });
  await expect(row).toContainText("Sin calendario");
});
