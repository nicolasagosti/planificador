import { expect, test, type Page } from "@playwright/test";
import { againstDeployedApp, STORAGE_STATE } from "./helpers";

// The Cliente screen on the seed data, with "today" on 5 October 2026.
test.skip(againstDeployedApp, "uses the seed data and the password login");

test.use({ storageState: STORAGE_STATE });

async function openClient(page: Page, name: string) {
  await page.goto("/");
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
}

/** The month links of the "Calendarios" table, newest first. */
const calendarMonths = (page: Page) =>
  page.getByRole("table", { name: "Calendarios" }).getByRole("link");

test("la pantalla Cliente cuenta el mes de Café Lumbre", async ({ page }) => {
  await openClient(page, "Café Lumbre");
  const main = page.getByRole("main");
  await expect(main).toContainText(
    "Cafetería de especialidad. Cliente desde julio de 2026.",
  );
  await expect(main).toContainText(
    "En octubre le debés 10 piezas, tenés 2 hechas sin entregar y ya le entregaste 3.",
  );
  await expect(main).toContainText(
    "1 está atrasada: el post de Facebook del viernes 2.",
  );

  await expect(calendarMonths(page)).toHaveText([
    "Noviembre 2026",
    "Octubre 2026",
    "Septiembre 2026",
    "Agosto 2026",
  ]);
  const calendars = page.getByRole("table", { name: "Calendarios" });
  const october = calendars.getByRole("row").filter({ hasText: "Octubre" });
  await expect(october).toContainText("Aprobado el 28 sep, en curso");
  await expect(
    october.getByRole("img", {
      name: "15 piezas: 3 entregadas, 2 hechas y 10 pendientes, 1 de ellas atrasada",
    }),
  ).toBeVisible();
  await expect(
    calendars.getByRole("row").filter({ hasText: "Noviembre" }),
  ).toContainText("Borrador, sin enviar");

  await expect(
    page
      .getByRole("table", { name: "Lo que sigue en octubre" })
      .getByRole("row"),
  ).toHaveText([
    /vie 2 oct.*Post en Facebook.*Promo de octubre.*Atrasada/,
    /mié 7 oct.*Horarios del feriado.*Hecha, falta entregarla/,
    /jue 8 oct.*Reel en Instagram.*Hecha, falta entregarla/,
    /sáb 10 oct.*Pendiente/,
    /mar 13 oct.*Pendiente/,
  ]);

  const data = page.getByRole("complementary", { name: "Datos del cliente" });
  await expect(data).toContainText("Carla Benítez, dueña");
  await expect(data).toContainText("11 5555-0142");
  await expect(data).toContainText("Instagram y Facebook");
  await expect(data).toContainText("Archivar no borra nada");
});

test("desde Cliente se abre cada calendario", async ({ page }) => {
  await openClient(page, "Café Lumbre");
  await page
    .getByRole("link", { name: "Abrir el calendario de octubre" })
    .click();
  await expect(page).toHaveURL(/\/calendarios\/2026-10$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Octubre 2026",
  );
  const main = page.getByRole("main");
  await expect(main).toContainText(
    "Aprobado el 28 sep. Las fechas y los temas quedaron fijos",
  );
  await expect(main).toContainText(
    "Debés 10 piezas, tenés 2 hechas sin entregar y ya entregaste 3.",
  );

  await page.getByRole("link", { name: "Ir a noviembre de 2026" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Noviembre 2026",
  );
  await expect(main).toContainText("Borrador: todavía no se lo mandaste.");

  await page.getByRole("link", { name: "Ir a diciembre de 2026" }).click();
  await expect(main).toContainText(
    "Todavía no hay calendario de diciembre para Café Lumbre.",
  );
  await expect(
    page.getByRole("button", { name: "Crear calendario" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Café Lumbre", exact: true }).click();
  await calendarMonths(page).filter({ hasText: "Septiembre" }).click();
  await expect(page).toHaveURL(/\/calendarios\/2026-09$/);
  await expect(main).toContainText("Aprobado el 27 ago.");
});

test("un cliente nuevo: sus calendarios, archivarlo y desarchivarlo", async ({
  page,
}) => {
  const name = "Prueba Cliente E2E";
  await page.goto("/");
  await page.getByRole("button", { name: "Nuevo cliente" }).click();
  const newClient = page.getByRole("dialog", { name: "Nuevo cliente" });
  await newClient.getByLabel("Nombre").fill(name);
  await newClient.getByRole("button", { name: "Crear cliente" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  const main = page.getByRole("main");
  await expect(main).toContainText(
    `Todavía no hay calendario de octubre para ${name}.`,
  );
  await expect(main).toContainText(
    "Todavía no armaste calendarios para este cliente.",
  );

  await page
    .getByRole("button", { name: "Crear calendario de octubre" })
    .click();
  await expect(page).toHaveURL(/\/calendarios\/2026-10$/);
  await expect(main).toContainText("Borrador: todavía no se lo mandaste.");

  await page.getByRole("link", { name, exact: true }).click();
  await expect(main).toContainText(
    "El calendario de octubre está en borrador: todavía no se lo mandaste.",
  );
  await expect(
    page.getByRole("link", { name: "Seguir armándolo" }),
  ).toHaveAttribute("href", /\/calendarios\/2026-10$/);

  await page.getByRole("button", { name: "Nuevo calendario" }).click();
  const newCalendar = page.getByRole("dialog", { name: "Nuevo calendario" });
  await expect(newCalendar.getByLabel("Mes")).toHaveValue("2026-11");
  await newCalendar.getByRole("button", { name: "Crear calendario" }).click();
  await expect(page).toHaveURL(/\/calendarios\/2026-11$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Noviembre 2026",
  );

  await page.getByRole("link", { name, exact: true }).click();
  await expect(calendarMonths(page)).toHaveText([
    "Noviembre 2026",
    "Octubre 2026",
  ]);

  await page.getByRole("button", { name: "Archivar cliente" }).click();
  await expect(main).toContainText(
    "No aparece en Clientes y sus piezas no cuentan.",
  );
  await expect(
    page.getByRole("button", { name: "Nuevo calendario" }),
  ).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Archivar cliente" }),
  ).toBeHidden();

  await page.getByRole("link", { name: "Clientes", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Café Lumbre", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name, exact: true })).toBeHidden();

  await page.getByRole("link", { name: "Ver clientes archivados" }).click();
  const archived = page.getByRole("listitem").filter({ hasText: name });
  await expect(archived).toContainText("Archivado el");
  await archived.getByRole("button", { name: "Desarchivar" }).click();
  await expect(archived).toBeHidden();
  await expect(main).toContainText("No tenés clientes archivados.");

  await page.getByRole("link", { name: "Clientes", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: name })).toContainText(
    "Borrador",
  );

  // Archived again: the Clientes tests count only the seed's clients.
  await page.getByRole("link", { name, exact: true }).click();
  await page.getByRole("button", { name: "Archivar cliente" }).click();
  await expect(page.getByRole("button", { name: "Desarchivar" })).toBeVisible();
});
