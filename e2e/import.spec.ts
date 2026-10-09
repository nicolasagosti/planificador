import { expect, test, type Page } from "@playwright/test";
import { againstDeployedApp, STORAGE_STATE } from "./helpers";
import { buildXlsx } from "./xlsx";

// Importing a calendar from a file, on the seed data with "today" on
// 5 October 2026. Vivero Las Lilas has no calendar for December.
test.skip(againstDeployedApp, "uses the seed data and the password login");

test.use({ storageState: STORAGE_STATE });

// The table of this page is built by a script when it opens.
const HTML_CALENDAR = "e2e/fixtures/calendario-diciembre.html";

async function openViveroDecember(page: Page) {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Vivero Las Lilas", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Abrir el calendario de octubre" })
    .click();
  await page.getByRole("link", { name: "Ir a noviembre de 2026" }).click();
  await page.getByRole("link", { name: "Ir a diciembre de 2026" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Diciembre 2026",
  );
}

async function openImport(page: Page) {
  await page.getByRole("button", { name: "Importar Excel o HTML" }).click();
  return page.getByRole("dialog", { name: "Importar Excel o HTML" });
}

test("explica los archivos que no puede importar", async ({ page }) => {
  await openViveroDecember(page);
  const dialog = await openImport(page);
  const file = dialog.getByLabel("Archivo");

  await file.setInputFiles({
    name: "notas.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Fecha y tema"),
  });
  await expect(dialog).toContainText(
    "Elegí un Excel (.xlsx) o una página web (.html).",
  );

  await file.setInputFiles({
    name: "horarios.html",
    mimeType: "text/html",
    buffer: Buffer.from(
      "<table><tr><th>Clase</th><th>Horario</th></tr><tr><td>Yoga</td><td>8hs</td></tr></table>",
    ),
  });
  await expect(dialog).toContainText("No encontramos la tabla de piezas.");

  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("main")).toContainText(
    "Todavía no hay calendario de diciembre para Vivero Las Lilas.",
  );
});

test("importa un HTML como borrador y un Excel que ya aprobó el cliente", async ({
  page,
}) => {
  await openViveroDecember(page);
  const main = page.getByRole("main");

  // The HTML: its table only exists once its script runs.
  let dialog = await openImport(page);
  await dialog.getByLabel("Archivo").setInputFiles(HTML_CALENDAR);
  await expect(dialog).toContainText("Encontramos 4 piezas de diciembre.");
  await expect(dialog).toContainText(
    "No entran en este calendario: 1 pieza de enero. Importá el mismo archivo en enero para cargarla.",
  );
  await expect(dialog).toContainText(
    "Jue 10/12 · Recorrida por el vivero. «Video» no es un formato de la app",
  );
  await expect(
    dialog
      .getByRole("table", { name: "Piezas que se importan" })
      .getByRole("row"),
  ).toHaveText([
    /Fecha.*Pieza.*Tema.*Estado/,
    // The idea keeps its lines, and the columns without a field go below it.
    /mar 1 dic.*Placa en Instagram.*Horarios de las fiestas.*Abrimos el 24 y el 31 hasta las 13\.\n\nObjetivo: Avisar los horarios\nCTA: Guardalo.*Pendiente/,
    /vie 4 dic.*Carrusel en Instagram.*Plantas para regalar/,
    /lun 7 dic.*Reel en Instagram.*Cómo trasplantar un potus/,
    /dom 13 dic.*Reel en Instagram.*Cuidados en verano/,
  ]);
  const network = dialog.getByLabel("¿En qué red van?");
  await expect(network).toHaveValue("instagram");
  await network.selectOption("Facebook");
  await expect(dialog).toContainText("Placa en Facebook");
  await expect(dialog.getByLabel("El cliente ya lo aprobó")).not.toBeChecked();

  await dialog.getByRole("button", { name: "Importar 4 piezas" }).click();
  await expect(dialog).toBeHidden();
  await expect(main).toContainText("Borrador: todavía no se lo mandaste.");

  // The Excel replaces the draft's pieces, and the client already approved it.
  dialog = await openImport(page);
  await dialog.getByLabel("Archivo").setInputFiles({
    name: "calendario-diciembre.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: buildXlsx("Diciembre", [
      ["Vivero Las Lilas · diciembre"],
      ["Fecha", "Red", "Formato", "Tema", "Copy", "Estado"],
      [
        { day: "2026-12-02" },
        "Instagram",
        "Reel",
        "Cómo regar en verano",
        "Temprano o a la tarde.",
        "Falta filmar",
      ],
      [
        { day: "2026-12-09" },
        "IG",
        "Reel",
        "Plantas de interior",
        "",
        "Filmado",
      ],
      [
        { day: "2026-12-16" },
        "Facebook",
        "Placa",
        "Horarios de las fiestas",
        "",
        "Subido",
      ],
      [
        { day: "2026-12-23" },
        "Instagram",
        "Historia",
        "Encuesta",
        "",
        "No subido",
      ],
    ]),
  });
  await expect(dialog).toContainText("Encontramos 4 piezas de diciembre.");
  await expect(dialog).toContainText(
    "Reemplaza las 4 piezas que tiene el calendario.",
  );
  await expect(dialog.getByLabel("¿En qué red van?")).toBeHidden();
  await expect(
    dialog
      .getByRole("table", { name: "Piezas que se importan" })
      .getByRole("row"),
  ).toHaveText([
    /Fecha/,
    /mié 2 dic.*Reel en Instagram.*Cómo regar en verano.*Pendiente/,
    /mié 9 dic.*Reel en Instagram.*Plantas de interior.*Hecha/,
    /mié 16 dic.*Placa en Facebook.*Horarios de las fiestas.*Entregada/,
    /mié 23 dic.*Historia en Instagram.*Encuesta.*Pendiente/,
  ]);
  await dialog.getByLabel("El cliente ya lo aprobó").check();
  await dialog.getByRole("button", { name: "Importar 4 piezas" }).click();
  await expect(dialog).toBeHidden();

  await expect(main).toContainText(/Aprobado el \d+ \w+\./);
  await expect(main).toContainText(
    "Debés 2 piezas, tenés 1 hecha sin entregar y ya entregaste 1.",
  );
  await expect(
    page.getByRole("button", { name: "Importar Excel o HTML" }),
  ).toBeHidden();

  await page
    .getByRole("link", { name: "Vivero Las Lilas", exact: true })
    .click();
  await expect(
    page
      .getByRole("table", { name: "Calendarios" })
      .getByRole("row")
      .filter({ hasText: "Diciembre" })
      .getByRole("img", {
        name: "4 piezas: 1 entregada, 1 hecha y 2 pendientes",
      }),
  ).toBeVisible();
});
