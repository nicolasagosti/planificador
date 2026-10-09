import { expect, test, type Page } from "@playwright/test";
import { againstDeployedApp, formAlert, STORAGE_STATE } from "./helpers";

// The approved calendar of Café Lumbre, on the seed data with "today" on
// 5 October 2026. Every test leaves the pieces as it found them: the Cliente
// and Clientes tests count them afterwards.
test.skip(againstDeployedApp, "uses the seed data and the password login");

test.use({ storageState: STORAGE_STATE });

async function openOctober(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: "Café Lumbre", exact: true }).click();
  await page
    .getByRole("link", { name: "Abrir el calendario de octubre" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Octubre 2026",
  );
}

const panel = (page: Page) =>
  page.getByRole("complementary", { name: "Pieza elegida" });
const headline = (page: Page) =>
  page.getByRole("main").locator("p").filter({ hasText: "Debés" });

test("la grilla y el panel muestran las piezas del mes", async ({ page }) => {
  await openOctober(page);

  // It opens on the first piece not delivered: the overdue one.
  await expect(panel(page).getByRole("heading")).toHaveText("Promo de octubre");
  await expect(panel(page)).toContainText("Post en Facebook");
  await expect(panel(page)).toContainText("Para el viernes 2 de octubre");
  await expect(panel(page)).toContainText(
    "Está atrasada: pasó la fecha y todavía no la entregaste.",
  );
  await expect(panel(page)).toContainText("Todavía no cargaste nada.");
  await expect(
    page.getByRole("button", {
      name: "Post en Facebook, viernes 2: Promo de octubre. Pendiente, atrasada.",
    }),
  ).toHaveAttribute("aria-pressed", "true");

  const delivered = page.getByRole("button", { name: /Carta de primavera/ });
  await delivered.click();
  await expect(delivered).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/\?pieza=/);
  await expect(panel(page)).toContainText(
    "Lista. No queda nada por hacer con esta pieza.",
  );
  await expect(panel(page)).toContainText("carta-primavera.zip");

  // The selected piece stays in the URL.
  await page.reload();
  await expect(panel(page).getByRole("heading")).toHaveText(
    "Carta de primavera",
  );
  await expect(page.getByRole("main")).toContainText(
    "IG es Instagram y FB es Facebook",
  );
});

test("al marcar una pieza cambian los números", async ({ page }) => {
  await openOctober(page);
  await page.getByRole("button", { name: /Así hacemos el flat white/ }).click();
  await expect(headline(page)).toHaveText(
    "Debés 10 piezas, tenés 2 hechas sin entregar y ya entregaste 3.",
  );

  await panel(page)
    .getByRole("button", { name: "Marcar como entregada" })
    .click();
  await expect(headline(page)).toHaveText(
    "Debés 10 piezas, tenés 1 hecha sin entregar y ya entregaste 4.",
  );
  await expect(panel(page)).toContainText(
    "Lista. No queda nada por hacer con esta pieza.",
  );

  // Saved: it survives a reload.
  await page.reload();
  await expect(headline(page)).toHaveText(
    "Debés 10 piezas, tenés 1 hecha sin entregar y ya entregaste 4.",
  );

  await panel(page).getByRole("button", { name: "Volver a hecha" }).click();
  await expect(headline(page)).toHaveText(
    "Debés 10 piezas, tenés 2 hechas sin entregar y ya entregaste 3.",
  );
  await page.reload();
  await expect(panel(page)).toContainText("el 4 oct");
  await expect(
    panel(page).getByRole("button", { name: "Marcar como entregada" }),
  ).toBeVisible();
});

test("el link del archivo se valida, se guarda y se quita", async ({
  page,
}) => {
  await openOctober(page);
  await page.getByRole("button", { name: /Encuesta/ }).click();
  await panel(page).getByRole("button", { name: "Pegar un link" }).click();

  await panel(page).getByLabel("Link").fill("ftp://archivos/encuesta.png");
  await panel(page).getByRole("button", { name: "Guardar" }).click();
  await expect(panel(page)).toContainText(
    "Pegá un link que empiece con http:// o https://.",
  );

  await panel(page)
    .getByLabel("Link")
    .fill("https://drive.google.com/file/d/encuesta/view");
  await panel(page)
    .getByLabel("Nombre del archivo (opcional)")
    .fill("encuesta.png");
  await panel(page).getByRole("button", { name: "Guardar" }).click();
  const open = panel(page).getByRole("link", { name: "Abrir en Drive" });
  await expect(open).toHaveAttribute(
    "href",
    "https://drive.google.com/file/d/encuesta/view",
  );
  await expect(open).toHaveAttribute("target", "_blank");
  await expect(open).toHaveAttribute("rel", "noopener noreferrer");
  await expect(panel(page)).toContainText("encuesta.png");

  // An empty link removes it, and its name too.
  await panel(page).getByRole("button", { name: "Cambiar el link" }).click();
  await panel(page).getByLabel("Link").fill("");
  await panel(page).getByRole("button", { name: "Guardar" }).click();
  await expect(panel(page)).toContainText("Todavía no cargaste nada.");
  await expect(formAlert(page)).toBeHidden();
});
