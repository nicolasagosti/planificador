import { describe, expect, it } from "vitest";
import { exportFileName, exportRows } from "./export";

describe("exportFileName", () => {
  it("names the file after the client and the month", () => {
    expect(exportFileName("Café Lumbre", "2026-10")).toBe(
      "calendario-cafe-lumbre-2026-10.xlsx",
    );
    expect(exportFileName("  Óptica Mirador & Cía. ", "2026-11")).toBe(
      "calendario-optica-mirador-cia-2026-11.xlsx",
    );
  });

  it("keeps a name for a client without letters or numbers", () => {
    expect(exportFileName("¡¡!!", "2026-10")).toBe(
      "calendario-cliente-2026-10.xlsx",
    );
  });
});

describe("exportRows", () => {
  it("writes the pieces by day, with networks and formats in words", () => {
    expect(
      exportRows([
        {
          date: "2026-10-08",
          status: "done",
          network: "instagram",
          format: "reel",
          topic: "Así hacemos el flat white",
          idea: "Paso a paso en la barra.",
        },
        {
          date: "2026-10-02",
          status: "pending",
          network: "facebook",
          format: "graphic",
          topic: "Promo de octubre",
          idea: null,
        },
      ]),
    ).toEqual([
      {
        date: "2026-10-02",
        network: "Facebook",
        format: "Placa",
        topic: "Promo de octubre",
        idea: "",
      },
      {
        date: "2026-10-08",
        network: "Instagram",
        format: "Reel",
        topic: "Así hacemos el flat white",
        idea: "Paso a paso en la barra.",
      },
    ]);
  });
});
