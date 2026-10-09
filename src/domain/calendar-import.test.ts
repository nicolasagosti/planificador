import { describe, expect, it } from "vitest";
import {
  importButtonText,
  importFoundText,
  missingNetworkText,
  otherMonthsText,
  problemsTitle,
  readCalendarImport,
  readDay,
  replaceText,
  type ImportTable,
} from "./calendar-import";

const OCTOBER = "2026-10";

/** One table with a header and rows, read for October. */
function read(rows: ImportTable, month = OCTOBER) {
  const result = readCalendarImport([rows], month);
  if (!result) throw new Error("No piece table found");
  return result;
}

describe("readDay", () => {
  it("reads the ways a calendar writes a day", () => {
    expect(readDay("Mar 6/10", OCTOBER)).toBe("2026-10-06");
    expect(readDay("6/10", OCTOBER)).toBe("2026-10-06");
    expect(readDay("06/10/2026", OCTOBER)).toBe("2026-10-06");
    expect(readDay("6-10-26", OCTOBER)).toBe("2026-10-06");
    expect(readDay("2026-10-06", OCTOBER)).toBe("2026-10-06");
    expect(readDay("martes 6 de octubre", OCTOBER)).toBe("2026-10-06");
    expect(readDay("Mié 7 oct.", OCTOBER)).toBe("2026-10-07");
    expect(readDay("6 de octubre de 2026", OCTOBER)).toBe("2026-10-06");
  });

  it("takes a lone day, with or without its weekday, from the month", () => {
    expect(readDay("6", OCTOBER)).toBe("2026-10-06");
    expect(readDay("Mar 6", OCTOBER)).toBe("2026-10-06");
    expect(readDay("sábado 31", OCTOBER)).toBe("2026-10-31");
  });

  it("keeps days of other months as they are", () => {
    expect(readDay("Lun 2/11", OCTOBER)).toBe("2026-11-02");
    expect(readDay("6 mar", OCTOBER)).toBe("2026-03-06");
    expect(readDay("30/9/2026", OCTOBER)).toBe("2026-09-30");
  });

  it("reads month first only when that falls in the calendar's month", () => {
    expect(readDay("10/02", OCTOBER)).toBe("2026-10-02");
    expect(readDay("10/02", "2026-02")).toBe("2026-02-10");
    expect(readDay("10/25", OCTOBER)).toBe("2026-10-25");
  });

  it("does not make up days", () => {
    expect(readDay("31/11", OCTOBER)).toBeNull();
    expect(readDay("32", OCTOBER)).toBeNull();
    expect(readDay("31", "2026-11")).toBeNull();
    expect(readDay("Semana 2", OCTOBER)).toBeNull();
    expect(readDay("", OCTOBER)).toBeNull();
  });
});

describe("readCalendarImport", () => {
  // The shape of the community manager's HTML: a "Pieza" with the format on
  // its first line, and columns the app has no field for.
  const htmlTable: ImportTable = [
    ["Calendario de contenido · octubre"],
    ["Fecha", "Pieza", "Objetivo", "Idea concreta", "CTA"],
    [
      "Mar 6/10",
      "Placa\nHorarios del feriado",
      "Avisar el cambio",
      "Abrimos de 9 a 14.",
      "Guardalo",
    ],
    [
      "Vie 9/10",
      "Carrusel\nCinco tips para el café en casa",
      "Aportar valor",
      "1) Molienda.\n2) Agua.",
      "",
    ],
    ["Lun 12/10", "Reel\nDetrás de la barra", "", "", ""],
    ["Jue 15/10", "Video\nUn día en el local", "", "", ""],
    ["Lun 2/11", "Reel\nLo que viene", "", "", ""],
  ];

  it("reads the pieces of the month, format and topic from the same cell", () => {
    const result = read(htmlTable);
    expect(result.pieces.map((piece) => [piece.date, piece.format])).toEqual([
      ["2026-10-06", "graphic"],
      ["2026-10-09", "carousel"],
      ["2026-10-12", "reel"],
    ]);
    expect(result.pieces[0]).toMatchObject({
      topic: "Horarios del feriado",
      network: null,
      status: "pending",
    });
  });

  it("adds the columns without a field to the idea, under their header", () => {
    const [first, second, third] = read(htmlTable).pieces;
    expect(first?.idea).toBe(
      "Abrimos de 9 a 14.\n\nObjetivo: Avisar el cambio\nCTA: Guardalo",
    );
    expect(second?.idea).toBe(
      "1) Molienda.\n2) Agua.\n\nObjetivo: Aportar valor",
    );
    expect(third?.idea).toBeNull();
  });

  it("counts the rows of other months apart", () => {
    expect(read(htmlTable).otherMonths).toEqual([
      { month: "2026-11", count: 1 },
    ]);
  });

  it("says why a row cannot be imported", () => {
    expect(read(htmlTable).problems).toEqual([
      {
        row: "Jue 15/10 · Un día en el local",
        message:
          "«Video» no es un formato de la app: usá Reel, Historia, Carrusel, Post o Placa.",
      },
    ]);
  });

  // The shape of a spreadsheet: one column per field.
  const sheet = (...rows: string[][]): ImportTable => [
    ["Fecha", "Red", "Formato", "Tema", "Copy", "Estado"],
    ...rows,
  ];

  it("reads network, format and topic from their own columns", () => {
    const result = read(
      sheet(
        ["2026-10-01", "IG", "Reels", "Día del café", "Texto", "Subido"],
        ["2026-10-02", "Facebook", "Post", "Promo de octubre", "", ""],
        ["2026-10-03", "Tik Tok", "historias", "Medialunas", "", ""],
      ),
    );
    expect(
      result.pieces.map(({ network, format, topic, idea }) => ({
        network,
        format,
        topic,
        idea,
      })),
    ).toEqual([
      {
        network: "instagram",
        format: "reel",
        topic: "Día del café",
        idea: "Texto",
      },
      {
        network: "facebook",
        format: "post",
        topic: "Promo de octubre",
        idea: null,
      },
      {
        network: "tiktok",
        format: "story",
        topic: "Medialunas",
        idea: null,
      },
    ]);
  });

  it("maps the four states of the files to the app's three", () => {
    const states = read(
      sheet(
        ["1", "IG", "Reel", "A", "", "Falta filmar"],
        ["2", "IG", "Reel", "B", "", "Filmado"],
        ["3", "IG", "Reel", "C", "", "No subido"],
        ["4", "IG", "Reel", "D", "", "SUBIDO"],
        ["5", "IG", "Reel", "E", "", ""],
      ),
    ).pieces.map((piece) => piece.status);
    expect(states).toEqual([
      "pending",
      "done",
      "pending",
      "delivered",
      "pending",
    ]);
  });

  it("combines a filming column and an upload column", () => {
    const table: ImportTable = [
      ["Fecha", "Formato", "Tema", "Filmación", "Subido"],
      ["1", "Reel", "A", "Falta filmar", "No subido"],
      ["2", "Reel", "B", "Filmado", "No subido"],
      ["3", "Reel", "C", "Filmado", "Subido"],
      ["4", "Placa", "D", "", "Subido"],
    ];
    expect(read(table).pieces.map((piece) => piece.status)).toEqual([
      "pending",
      "done",
      "delivered",
      "delivered",
    ]);
  });

  it("does not guess unknown states or networks", () => {
    const { problems } = read(
      sheet(
        ["1", "IG", "Reel", "A", "", "En edición"],
        ["2", "IG y FB", "Reel", "B", "", ""],
        ["3", "Twitter", "Reel", "C", "", ""],
      ),
    );
    expect(problems.map((problem) => problem.message)).toEqual([
      "No conocemos el estado «En edición»: usá Falta filmar, Filmado, No subido o Subido.",
      "Va en más de una red («IG y FB») y en la app cada pieza tiene una sola: separala en una fila por red.",
      "«Twitter» no es una red de la app: usá Instagram, Facebook o TikTok.",
    ]);
  });

  it("reports every missing field of a row at once", () => {
    const { problems } = read(
      sheet(["", "IG", "", "", "Sin fecha ni tema", ""]),
    );
    expect(problems).toEqual([
      {
        row: "IG",
        message: "Falta la fecha. Falta el formato. Falta el tema.",
      },
    ]);
  });

  it("checks the topic and idea limits", () => {
    const { problems } = read(
      sheet(
        ["1", "IG", "Reel", "x".repeat(121), "", ""],
        ["2", "IG", "Reel", "Largo", "y".repeat(2001), ""],
      ),
    );
    expect(problems.map((problem) => problem.message)).toEqual([
      "El tema tiene 121 caracteres y el máximo es 120.",
      "La idea, con las columnas que se le suman, tiene 2001 caracteres y el máximo es 2000.",
    ]);
  });

  it("skips titles, blank rows and repeated headers", () => {
    const result = read([
      ["Café Lumbre"],
      [],
      ["Fecha", "Formato", "Tema"],
      ["Semana 1", "", ""],
      ["1", "Reel", "Día del café"],
      ["", "", ""],
      ["Fecha", "Formato", "Tema"],
      ["8", "Reel", "Flat white"],
    ]);
    expect(result.pieces.map((piece) => piece.topic)).toEqual([
      "Día del café",
      "Flat white",
    ]);
    expect(result.problems).toEqual([]);
  });

  it("uses the first date column that reads as a date", () => {
    const result = read([
      ["Día", "Fecha", "Formato", "Tema"],
      ["Martes", "6/10", "Placa", "Horarios"],
    ]);
    expect(result.pieces[0]?.date).toBe("2026-10-06");
  });

  it("orders the pieces by day and keeps the file's order within a day", () => {
    const result = read(
      sheet(
        ["8", "IG", "Reel", "B", "", ""],
        ["1", "IG", "Reel", "A", "", ""],
        ["8", "IG", "Historia", "C", "", ""],
      ),
    );
    expect(result.pieces.map((piece) => piece.topic)).toEqual(["A", "B", "C"]);
  });

  it("splits a one-line piece with a separator", () => {
    const result = read([
      ["Fecha", "Pieza"],
      ["1", "Reel: Detrás de la barra"],
      ["2", "Historia - Encuesta"],
      ["3", "Promo: dos por uno"],
    ]);
    expect(result.pieces.map((piece) => [piece.format, piece.topic])).toEqual([
      ["reel", "Detrás de la barra"],
      ["story", "Encuesta"],
    ]);
    expect(result.problems[0]?.message).toBe("Falta el formato.");
  });

  it("reads a long first line of a piece as topic, not as format", () => {
    const result = read([
      ["Fecha", "Pieza"],
      ["1", "Así hacemos el flat white\nen la barra"],
    ]);
    expect(result.problems).toEqual([
      {
        row: "1 · Así hacemos el flat white en la barra",
        message: "Falta el formato.",
      },
    ]);
  });

  it("reads a piece column as the format when the topic has its own", () => {
    const result = read([
      ["Fecha", "Pieza", "Tema"],
      ["1", "Carrusel", "Carta de primavera"],
    ]);
    expect(result.pieces[0]).toMatchObject({
      format: "carousel",
      topic: "Carta de primavera",
    });
  });

  it("reads tables with the same columns as one, and picks the best", () => {
    const week = (day: string): ImportTable => [
      ["Fecha", "Formato", "Tema"],
      [day, "Reel", `Día ${day}`],
    ];
    const summary: ImportTable = [
      ["Fecha", "Tema"],
      ["1", "Resumen"],
    ];
    const result = readCalendarImport(
      [summary, week("1"), week("8"), week("15")],
      OCTOBER,
    );
    expect(result?.pieces.map((piece) => piece.topic)).toEqual([
      "Día 1",
      "Día 8",
      "Día 15",
    ]);
  });

  it("finds nothing without a date and a topic or piece column", () => {
    expect(
      readCalendarImport(
        [
          [
            ["Nombre", "Horario"],
            ["Yoga", "8hs"],
          ],
        ],
        OCTOBER,
      ),
    ).toBeNull();
    expect(readCalendarImport([], OCTOBER)).toBeNull();
  });
});

describe("the preview's texts", () => {
  it("says what it found", () => {
    expect(importFoundText(9, OCTOBER)).toBe(
      "Encontramos 9 piezas de octubre.",
    );
    expect(importFoundText(1, OCTOBER)).toBe("Encontramos 1 pieza de octubre.");
    expect(importFoundText(0, OCTOBER)).toBe(
      "El archivo no tiene piezas de octubre.",
    );
  });

  it("says which pieces belong to other months", () => {
    expect(otherMonthsText([])).toBeNull();
    expect(otherMonthsText([{ month: "2026-11", count: 1 }])).toBe(
      "No entran en este calendario: 1 pieza de noviembre. Importá el mismo archivo en noviembre para cargarla.",
    );
    expect(
      otherMonthsText([
        { month: "2026-09", count: 3 },
        { month: "2026-11", count: 1 },
      ]),
    ).toBe(
      "No entran en este calendario: 3 piezas de septiembre y 1 de noviembre. Importá el mismo archivo en septiembre y noviembre para cargarlas.",
    );
  });

  it("agrees in number", () => {
    expect(problemsTitle(1)).toBe("1 fila no se importa:");
    expect(problemsTitle(2)).toBe("2 filas no se importan:");
    expect(missingNetworkText(1)).toBe("El archivo no dice la red de 1 pieza.");
    expect(missingNetworkText(9)).toBe(
      "El archivo no dice la red de 9 piezas.",
    );
    expect(replaceText(0)).toBeNull();
    expect(replaceText(1)).toBe("Reemplaza la pieza que tiene el calendario.");
    expect(replaceText(4)).toBe(
      "Reemplaza las 4 piezas que tiene el calendario.",
    );
    expect(importButtonText(1)).toBe("Importar 1 pieza");
    expect(importButtonText(9)).toBe("Importar 9 piezas");
  });
});
