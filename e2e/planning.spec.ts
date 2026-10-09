import { expect, test, type Page } from "@playwright/test";
import { againstDeployedApp, STORAGE_STATE } from "./helpers";

// A new calendar from draft to approved, and back, on a client of its own
// that the test archives at the end so the Clientes tests count only the
// seed's clients. "Today" is 5 October 2026.
test.skip(againstDeployedApp, "uses the seed data and the password login");

test.use({ storageState: STORAGE_STATE });

const panel = (page: Page) => page.getByRole("complementary");

async function addPiece(
  page: Page,
  day: string,
  piece: { network: string; format: string; topic: string; idea?: string },
) {
  await page
    .getByRole("button", { name: `Agregar una pieza el ${day}` })
    .click();
  await panel(page).getByLabel("Red").selectOption(piece.network);
  await panel(page).getByLabel("Formato").selectOption(piece.format);
  await panel(page).getByLabel("Tema").fill(piece.topic);
  if (piece.idea) await panel(page).getByLabel("Idea").fill(piece.idea);
  await panel(page).getByRole("button", { name: "Agregar pieza" }).click();
  await expect(
    page.getByRole("button", { name: new RegExp(piece.topic) }),
  ).toBeVisible();
}

test("se arma un calendario nuevo y se lo lleva hasta aprobado", async ({
  page,
}) => {
  const name = "Prueba Calendario E2E";
  await page.goto("/");
  await page.getByRole("button", { name: "Nuevo cliente" }).click();
  const newClient = page.getByRole("dialog", { name: "Nuevo cliente" });
  await newClient.getByLabel("Nombre").fill(name);
  await newClient.getByRole("button", { name: "Crear cliente" }).click();
  await page
    .getByRole("button", { name: "Crear calendario de octubre" })
    .click();
  const main = page.getByRole("main");
  await expect(main).toContainText("Borrador: todavía no se lo mandaste.");

  // Empty, it cannot be sent.
  const send = page.getByRole("button", { name: "Marcar como enviado" });
  await expect(send).toBeDisabled();
  await expect(main).toContainText(
    "Agregá al menos una pieza para poder enviarlo.",
  );

  // Loading pieces: the form validates on the server.
  await page
    .getByRole("button", { name: "Agregar una pieza el martes 6" })
    .click();
  await panel(page).getByRole("button", { name: "Agregar pieza" }).click();
  await expect(panel(page)).toContainText("Elegí el formato.");
  await expect(panel(page)).toContainText("Escribí el tema.");
  await panel(page).getByRole("button", { name: "Cancelar" }).click();

  await addPiece(page, "martes 6", {
    network: "Instagram",
    format: "Reel",
    topic: "Detrás de escena",
    idea: "Una mañana en el local.",
  });
  await addPiece(page, "jueves 8", {
    network: "Facebook",
    format: "Placa",
    topic: "Horarios de octubre",
  });
  await addPiece(page, "viernes 9", {
    network: "Instagram",
    format: "Historia",
    topic: "Pieza de más",
  });

  // Editing: the date has to stay in October.
  await page.getByRole("button", { name: /Horarios de octubre/ }).click();
  await panel(page).getByLabel("Fecha").fill("2026-11-03");
  await panel(page).getByRole("button", { name: "Guardar" }).click();
  await expect(panel(page)).toContainText(
    "La fecha tiene que ser de octubre de 2026.",
  );
  await panel(page).getByLabel("Fecha").fill("2026-10-15");
  await panel(page).getByLabel("Tema").fill("Horarios del feriado");
  await panel(page).getByRole("button", { name: "Guardar" }).click();
  await expect(
    page.getByRole("button", {
      name: "Placa en Facebook, jueves 15: Horarios del feriado.",
    }),
  ).toBeVisible();

  // Deleting a piece.
  await page.getByRole("button", { name: /Pieza de más/ }).click();
  await panel(page).getByRole("button", { name: "Eliminar pieza" }).click();
  await expect(page.getByRole("button", { name: /Pieza de más/ })).toBeHidden();

  // Sent: read only, and back to draft.
  await send.click();
  await expect(main).toContainText("Enviado");
  await page.getByRole("button", { name: /Detrás de escena/ }).click();
  await expect(panel(page)).toContainText(
    "Para cambiarla, volvé el calendario a borrador.",
  );
  await expect(panel(page).getByLabel("Tema")).toBeHidden();
  await expect(
    page.getByRole("button", { name: /Agregar una pieza/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Volver a borrador" }).click();
  await expect(main).toContainText("Borrador: todavía no se lo mandaste.");

  // Sent again and approved: the pieces start to count.
  await send.click();
  await page.getByRole("button", { name: "Marcar como aprobado" }).click();
  await expect(main).toContainText("Aprobado el");
  await expect(main).toContainText(
    "Debés 2 piezas, tenés 0 hechas sin entregar y ya entregaste 0.",
  );
  await page.getByRole("button", { name: /Detrás de escena/ }).click();
  await panel(page).getByRole("button", { name: "Marcar como hecha" }).click();
  await expect(main).toContainText(
    "Debés 1 pieza, tenés 1 hecha sin entregar y ya entregaste 0.",
  );

  // Reopened: back to draft, the pieces keep their state.
  await page.getByRole("button", { name: "Reabrir calendario" }).click();
  const reopen = page.getByRole("dialog", {
    name: "¿Reabrir el calendario de octubre?",
  });
  await expect(reopen).toContainText("Las piezas conservan su estado");
  await reopen.getByRole("button", { name: "Reabrir calendario" }).click();
  await expect(main).toContainText("Borrador: todavía no se lo mandaste.");

  // Deleting it warns that the client had approved it.
  await page.getByRole("button", { name: "Eliminar calendario" }).click();
  const remove = page.getByRole("dialog", {
    name: "¿Eliminar el calendario de octubre?",
  });
  await expect(remove).toContainText("Se borra con sus 2 piezas.");
  await expect(remove).toContainText(
    "El cliente ya lo había aprobado: también se borra esa constancia.",
  );
  await remove.getByRole("button", { name: "Eliminar calendario" }).click();
  await expect(main).toContainText(
    `Todavía no hay calendario de octubre para ${name}.`,
  );

  // Archived: the Clientes tests count only the seed's clients.
  await page.getByRole("link", { name, exact: true }).click();
  await page.getByRole("button", { name: "Archivar cliente" }).click();
  await expect(page.getByRole("button", { name: "Desarchivar" })).toBeVisible();
});

test("desde Cliente se aprueba un calendario enviado", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Estudio Pampa", exact: true }).click();
  const main = page.getByRole("main");
  await expect(main).toContainText(
    "Le mandaste el calendario de octubre el 1 oct y todavía no lo aprobó.",
  );
  await page.getByRole("button", { name: "Marcar como aprobado" }).click();
  // The last test of the run: the seed is reloaded after it.
  await expect(main).toContainText("En octubre le debés 8 piezas");
});
