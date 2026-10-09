import { expect, test, type Page } from "@playwright/test";
import readXlsxFile from "read-excel-file/node";
import { againstDeployedApp, STORAGE_STATE } from "./helpers";

// Exporting Café Lumbre's October (15 pieces) for the client.
test.skip(againstDeployedApp, "uses the seed data and the password login");

test.use({ storageState: STORAGE_STATE });

async function openExport(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: "Café Lumbre", exact: true }).click();
  await page
    .getByRole("link", { name: "Abrir el calendario de octubre" })
    .click();
  await page.getByRole("button", { name: "Exportar para el cliente" }).click();
  return page.getByRole("dialog", { name: "Exportar para el cliente" });
}

test("el Excel tiene todas las piezas del mes", async ({ page }) => {
  const dialog = await openExport(page);
  await expect(dialog).toContainText("calendario-cafe-lumbre-2026-10.xlsx");
  const downloading = page.waitForEvent("download");
  await dialog.getByRole("link", { name: "Descargar el Excel" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe(
    "calendario-cafe-lumbre-2026-10.xlsx",
  );

  const path = await download.path();
  const [sheet] = await readXlsxFile(path);
  expect(sheet?.sheet).toBe("Octubre 2026");
  const rows = sheet?.data ?? [];
  expect(rows[0]).toEqual(["Fecha", "Red", "Formato", "Tema", "Idea"]);
  expect(rows).toHaveLength(16);
  const first = rows[1] ?? [];
  expect(first[0]).toEqual(new Date(Date.UTC(2026, 9, 1)));
  expect(first.slice(1)).toEqual([
    "Instagram",
    "Reel",
    "Día Internacional del Café",
    "El recorrido del grano hasta la taza, en veinte segundos.",
  ]);
  expect(rows.at(-1)?.[3]).toBe("Lo que viene en noviembre");
});

test("la vista para imprimir tiene todas las piezas y no la barra de la app", async ({
  page,
}) => {
  const dialog = await openExport(page);
  const opening = page.waitForEvent("popup");
  await dialog
    .getByRole("link", { name: "Abrir para imprimir o guardar como PDF" })
    .click();
  const sheet = await opening;
  await expect(sheet).toHaveURL(/\/calendarios\/2026-10\/imprimir$/);
  await expect(sheet.getByRole("heading", { level: 1 })).toHaveText(
    "Café Lumbre",
  );
  await expect(sheet.getByRole("main")).toContainText(
    "Calendario de contenido de octubre 2026",
  );
  await expect(sheet.getByRole("button", { name: "Salir" })).toHaveCount(0);
  const rows = sheet.getByRole("table").getByRole("row");
  await expect(rows).toHaveCount(16);
  await expect(rows.nth(1)).toContainText(
    "jue 1 octInstagramReelDía Internacional del Café",
  );
  await expect(
    sheet.getByRole("button", { name: "Imprimir o guardar como PDF" }),
  ).toBeVisible();

  // On paper the button does not show.
  await sheet.emulateMedia({ media: "print" });
  await expect(
    sheet.getByRole("button", { name: "Imprimir o guardar como PDF" }),
  ).toBeHidden();
});

test("sin sesión no se descarga el Excel", async ({ browser, page }) => {
  await openExport(page);
  const excel = `${page.url().replace(/\?.*$/, "")}/excel`;
  const anonymous = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const response = await anonymous.request.get(excel, { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toMatch(/^\/login/);
  await anonymous.close();
});
