import { describe, expect, it } from "vitest";
import {
  assetInputSchema,
  calendarImportSchema,
  clientInputSchema,
  idSchema,
  isHttpUrl,
  pieceInputSchema,
} from "./schemas";

function firstError(result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}) {
  return result.error?.issues[0]?.message;
}

describe("clientInputSchema", () => {
  it("requires a name and turns empty fields into null", () => {
    const result = clientInputSchema.parse({
      name: "  Café Lumbre  ",
      industry: "",
      contactName: "   ",
      notes: null,
    });
    expect(result).toEqual({
      name: "Café Lumbre",
      industry: null,
      contactName: null,
      contactPhone: null,
      networks: [],
      approvalNotes: null,
      notes: null,
      clientSince: null,
    });
  });

  it("explains a missing name", () => {
    expect(firstError(clientInputSchema.safeParse({ name: "   " }))).toBe(
      "Escribí el nombre del cliente.",
    );
    expect(firstError(clientInputSchema.safeParse({}))).toBe(
      "Escribí el nombre del cliente.",
    );
  });

  it("keeps networks from the list, in order and without repeats", () => {
    expect(
      clientInputSchema.parse({
        name: "A",
        networks: ["facebook", "instagram", "facebook"],
      }).networks,
    ).toEqual(["instagram", "facebook"]);
    expect(
      firstError(
        clientInputSchema.safeParse({ name: "A", networks: ["myspace"] }),
      ),
    ).toBe("Elegí redes de la lista.");
  });

  it("stores «cliente desde» as the first day of the month", () => {
    expect(
      clientInputSchema.parse({ name: "A", clientSince: "2026-07" })
        .clientSince,
    ).toBe("2026-07-01");
    expect(
      clientInputSchema.parse({ name: "A", clientSince: "" }).clientSince,
    ).toBeNull();
    expect(
      firstError(
        clientInputSchema.safeParse({ name: "A", clientSince: "2026-13" }),
      ),
    ).toBe("Elegí un mes válido.");
  });
});

describe("pieceInputSchema", () => {
  const october = pieceInputSchema("2026-10");
  const valid = {
    date: "2026-10-08",
    network: "instagram",
    format: "reel",
    topic: "  Así hacemos el flat white ",
    idea: "",
  };

  it("accepts a piece of the calendar's month", () => {
    expect(october.parse(valid)).toEqual({
      date: "2026-10-08",
      network: "instagram",
      format: "reel",
      topic: "Así hacemos el flat white",
      idea: null,
    });
  });

  it("keeps the date inside the calendar's month", () => {
    expect(
      firstError(october.safeParse({ ...valid, date: "2026-11-02" })),
    ).toBe("La fecha tiene que ser de octubre de 2026.");
    const impossible = october.safeParse({ ...valid, date: "2026-10-32" });
    expect(impossible.error?.issues.map((issue) => issue.message)).toEqual([
      "Elegí una fecha válida.",
    ]);
  });

  it("requires a topic of up to 120 characters and an idea of up to 2000", () => {
    expect(firstError(october.safeParse({ ...valid, topic: " " }))).toBe(
      "Escribí el tema.",
    );
    expect(
      october.safeParse({ ...valid, topic: "x".repeat(120) }).success,
    ).toBe(true);
    expect(
      firstError(october.safeParse({ ...valid, topic: "x".repeat(121) })),
    ).toBe("El tema puede tener hasta 120 caracteres.");
    expect(
      october.safeParse({ ...valid, idea: "x".repeat(2000) }).success,
    ).toBe(true);
    expect(
      firstError(october.safeParse({ ...valid, idea: "x".repeat(2001) })),
    ).toBe("La idea puede tener hasta 2000 caracteres.");
  });

  it("takes network and format from the fixed lists", () => {
    expect(firstError(october.safeParse({ ...valid, network: "x" }))).toBe(
      "Elegí la red.",
    );
    expect(firstError(october.safeParse({ ...valid, format: "x" }))).toBe(
      "Elegí el formato.",
    );
  });
});

describe("calendarImportSchema", () => {
  const october = calendarImportSchema("2026-10");
  const piece = {
    date: "2026-10-06",
    network: "instagram",
    format: "graphic",
    topic: " Horarios del feriado ",
    idea: "",
    status: "done",
  };

  it("takes the pieces with their state and whether it was approved", () => {
    expect(october.parse({ approved: true, pieces: [piece] })).toEqual({
      approved: true,
      pieces: [{ ...piece, topic: "Horarios del feriado", idea: null }],
    });
  });

  it("validates each piece like the form does", () => {
    const withPiece = (change: object) =>
      october.safeParse({ approved: false, pieces: [{ ...piece, ...change }] });
    expect(firstError(withPiece({ date: "2026-11-02" }))).toBe(
      "La fecha tiene que ser de octubre de 2026.",
    );
    expect(firstError(withPiece({ network: null }))).toBe("Elegí la red.");
    expect(firstError(withPiece({ status: "filmado" }))).toBe(
      "Elegí el estado.",
    );
  });

  it("needs between 1 and 200 pieces", () => {
    expect(firstError(october.safeParse({ approved: false, pieces: [] }))).toBe(
      "El archivo no tiene piezas para importar.",
    );
    const pieces = Array.from({ length: 201 }, () => piece);
    expect(firstError(october.safeParse({ approved: false, pieces }))).toBe(
      "El archivo tiene más de 200 piezas de octubre: revisá que sea el calendario de un mes.",
    );
  });
});

describe("assetInputSchema", () => {
  it("accepts http and https links, with an optional name", () => {
    expect(
      assetInputSchema.parse({
        url: " https://drive.google.com/file/d/abc/view ",
        name: "flat-white.mp4",
      }),
    ).toEqual({
      url: "https://drive.google.com/file/d/abc/view",
      name: "flat-white.mp4",
    });
    expect(assetInputSchema.parse({ url: "http://example.com/a.png" })).toEqual(
      {
        url: "http://example.com/a.png",
        name: null,
      },
    );
  });

  it("refuses any other kind of link", () => {
    for (const url of [
      "javascript:alert(1)",
      "ftp://example.com/a",
      "drive.google.com/x",
      "texto",
    ]) {
      expect(firstError(assetInputSchema.safeParse({ url }))).toBe(
        "Pegá un link que empiece con http:// o https://.",
      );
    }
  });

  it("removes the link, and its name, when it is left empty", () => {
    expect(assetInputSchema.parse({ url: "", name: "viejo.png" })).toEqual({
      url: null,
      name: null,
    });
  });
});

describe("helpers", () => {
  it("checks http(s) links and ids", () => {
    expect(isHttpUrl("https://a.b")).toBe(true);
    expect(isHttpUrl("data:text/html,x")).toBe(false);
    expect(
      idSchema.safeParse("6f1c9a8e-1b2c-4d3e-8f90-123456789abc").success,
    ).toBe(true);
    expect(idSchema.safeParse("1 OR 1=1").success).toBe(false);
  });
});
