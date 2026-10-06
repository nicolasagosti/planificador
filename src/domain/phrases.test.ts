import { describe, expect, it } from "vitest";
import type { OverviewCalendar } from "./month-overview";
import type { PieceState } from "./pieces";
import {
  assetLink,
  calendarCell,
  calendarHeadline,
  calendarOverdueNote,
  calendarRowStatus,
  calendarStatusLine,
  clientHeadline,
  clientMonthState,
  clientOverdueLine,
  clientSubtitle,
  createCalendarLabel,
  dueLine,
  goToMonthLabel,
  monthHeadline,
  monthOverdueLine,
  nextDeliveryCell,
  notCountingNote,
  pieceAriaLabel,
  pieceStateLabel,
  pieceSteps,
  plainText,
  squaresDescription,
  todayLine,
} from "./phrases";

const TODAY = "2026-10-05";
const OCTOBER = "2026-10";

function approvedCalendar(pieces: PieceState[]): OverviewCalendar {
  return {
    status: "approved",
    sentOn: "2026-09-24",
    approvedOn: "2026-09-28",
    pieces,
  };
}

describe("headlines", () => {
  it("says what you owe, what is done and what you delivered", () => {
    const headline = monthHeadline(
      { approvedCalendars: 4, pending: 25, done: 9, delivered: 13 },
      OCTOBER,
    );
    expect(plainText(headline)).toBe(
      "Debés 25 piezas, tenés 9 hechas sin entregar y ya entregaste 13.",
    );
    expect(
      headline.flatMap((s) =>
        s.kind === "figure" ? [[s.status, s.value]] : [],
      ),
    ).toEqual([
      ["pending", 25],
      ["done", 9],
      ["delivered", 13],
    ]);
  });

  it("agrees in number", () => {
    expect(
      plainText(
        monthHeadline(
          { approvedCalendars: 1, pending: 1, done: 1, delivered: 1 },
          OCTOBER,
        ),
      ),
    ).toBe("Debés 1 pieza, tenés 1 hecha sin entregar y ya entregaste 1.");
  });

  it("says you are up to date when everything is delivered", () => {
    expect(
      plainText(
        monthHeadline(
          { approvedCalendars: 4, pending: 0, done: 0, delivered: 13 },
          OCTOBER,
        ),
      ),
    ).toBe("Estás al día: entregaste las 13 piezas de octubre.");
    expect(
      plainText(
        monthHeadline(
          { approvedCalendars: 1, pending: 0, done: 0, delivered: 1 },
          OCTOBER,
        ),
      ),
    ).toBe("Estás al día: entregaste la única pieza de octubre.");
  });

  it("says when no calendar is approved yet", () => {
    expect(
      plainText(
        monthHeadline(
          { approvedCalendars: 0, pending: 0, done: 0, delivered: 0 },
          OCTOBER,
        ),
      ),
    ).toBe("Todavía no tenés calendarios aprobados en octubre.");
  });

  it("speaks to one client on its own screen", () => {
    expect(
      plainText(
        clientHeadline({ pending: 10, done: 2, delivered: 3 }, OCTOBER),
      ),
    ).toBe(
      "En octubre le debés 10 piezas, tenés 2 hechas sin entregar y ya le entregaste 3.",
    );
    expect(
      plainText(
        clientHeadline({ pending: 0, done: 0, delivered: 15 }, OCTOBER),
      ),
    ).toBe("Estás al día: le entregaste las 15 piezas de octubre.");
  });

  it("uses the Clientes sentence for one calendar", () => {
    expect(
      plainText(
        calendarHeadline({ pending: 10, done: 2, delivered: 3 }, OCTOBER),
      ),
    ).toBe("Debés 10 piezas, tenés 2 hechas sin entregar y ya entregaste 3.");
  });
});

describe("overdue sentences", () => {
  it("lists overdue pieces by client on Clientes", () => {
    expect(
      monthOverdueLine([
        { name: "Óptica Mirador", overdue: 2 },
        { name: "Café Lumbre", overdue: 1 },
      ]),
    ).toEqual({
      lead: "3 están atrasadas:",
      rest: " 2 de Óptica Mirador y 1 de Café Lumbre.",
    });
    expect(monthOverdueLine([{ name: "Café Lumbre", overdue: 1 }])).toEqual({
      lead: "1 está atrasada:",
      rest: " es de Café Lumbre.",
    });
    expect(monthOverdueLine([{ name: "Óptica Mirador", overdue: 2 }])).toEqual({
      lead: "2 están atrasadas:",
      rest: " son de Óptica Mirador.",
    });
    expect(monthOverdueLine([])).toBeNull();
  });

  it("names the only overdue piece on Cliente, or counts them", () => {
    const post = {
      date: "2026-10-02",
      status: "pending" as const,
      format: "post",
      network: "facebook",
    };
    const story = {
      date: "2026-10-03",
      status: "done" as const,
      format: "story",
      network: "instagram",
    };
    expect(clientOverdueLine([post], TODAY)).toEqual({
      lead: "1 está atrasada:",
      rest: " el post de Facebook del viernes 2.",
    });
    expect(clientOverdueLine([story], TODAY)?.rest).toBe(
      " la historia de Instagram del sábado 3.",
    );
    expect(clientOverdueLine([post, story], TODAY)).toEqual({
      lead: "2 están atrasadas.",
      rest: "",
    });
    expect(
      clientOverdueLine([{ ...post, date: "2026-10-20" }], TODAY),
    ).toBeNull();
  });

  it("sums up the calendar", () => {
    expect(calendarOverdueNote(0)).toEqual({
      text: "Ninguna atrasada.",
      overdue: false,
    });
    expect(calendarOverdueNote(1)).toEqual({
      text: "1 está atrasada.",
      overdue: true,
    });
    expect(calendarOverdueNote(3)).toEqual({
      text: "3 están atrasadas.",
      overdue: true,
    });
  });
});

describe("notCountingNote", () => {
  it("writes the mockup sentence", () => {
    expect(
      notCountingNote({
        sent: [{ name: "Estudio Pampa", pieces: 8 }],
        draft: [{ name: "Impulso Funcional", pieces: 6 }],
      }),
    ).toBe(
      "No cuentan todavía: 8 piezas de Estudio Pampa, que tiene el calendario sin aprobar, y 6 de Impulso Funcional, que sigue en borrador.",
    );
  });

  it("handles one group, several clients and a single piece", () => {
    expect(
      notCountingNote({ sent: [], draft: [{ name: "Impulso", pieces: 1 }] }),
    ).toBe("No cuentan todavía: 1 pieza de Impulso, que sigue en borrador.");
    expect(
      notCountingNote({
        sent: [
          { name: "Estudio Pampa", pieces: 8 },
          { name: "Vivero", pieces: 5 },
        ],
        draft: [
          { name: "Alfa", pieces: 2 },
          { name: "Beta", pieces: 3 },
        ],
      }),
    ).toBe(
      "No cuentan todavía: 8 piezas de Estudio Pampa y 5 de Vivero, que tienen el calendario sin aprobar, y 2 de Alfa y 3 de Beta, que siguen en borrador.",
    );
    expect(notCountingNote({ sent: [], draft: [] })).toBeNull();
  });
});

describe("Clientes table", () => {
  it("describes the month's calendar", () => {
    expect(calendarCell(null, TODAY)).toEqual({
      status: "none",
      label: "Sin calendario",
      detail: null,
    });
    expect(createCalendarLabel(OCTOBER)).toBe("Crear calendario de octubre");
    expect(
      calendarCell(
        { status: "draft", sentOn: null, approvedOn: null, pieces: [] },
        TODAY,
      ),
    ).toEqual({ status: "draft", label: "Borrador", detail: "sin enviar" });
    expect(
      calendarCell(
        { status: "sent", sentOn: "2026-10-01", approvedOn: null, pieces: [] },
        TODAY,
      ).detail,
    ).toBe("hace 4 días, sin respuesta");
    expect(
      calendarCell(
        { status: "sent", sentOn: TODAY, approvedOn: null, pieces: [] },
        TODAY,
      ).detail,
    ).toBe("hoy, sin respuesta");
    expect(calendarCell(approvedCalendar([]), TODAY)).toEqual({
      status: "approved",
      label: "Aprobado",
      detail: "el 28 sep",
    });
  });

  it("says when the next piece is due", () => {
    const overdue = approvedCalendar([
      { date: "2026-10-01", status: "delivered" },
      { date: "2026-10-02", status: "pending" },
      { date: "2026-10-03", status: "pending" },
    ]);
    expect(nextDeliveryCell(overdue, TODAY)).toEqual({
      kind: "date",
      date: "vie 2 oct",
      note: "2 atrasadas",
      overdue: true,
    });
    const doneNext = approvedCalendar([
      { date: "2026-10-06", status: "done" },
      { date: "2026-10-09", status: "pending" },
    ]);
    expect(nextDeliveryCell(doneNext, TODAY)).toMatchObject({
      date: "mar 6 oct",
      note: "ya está hecha",
      overdue: false,
    });
    const pendingNext = approvedCalendar([
      { date: "2026-10-09", status: "pending" },
    ]);
    expect(nextDeliveryCell(pendingNext, TODAY)).toMatchObject({
      note: "falta hacerla",
    });
    expect(
      nextDeliveryCell(
        approvedCalendar([{ date: "2026-10-01", status: "delivered" }]),
        TODAY,
      ),
    ).toEqual({ kind: "note", note: "Todo entregado" });
    expect(
      nextDeliveryCell(
        { status: "sent", sentOn: "2026-10-01", approvedOn: null, pieces: [] },
        TODAY,
      ),
    ).toEqual({ kind: "note", note: "Cuando apruebe" });
    expect(
      nextDeliveryCell(
        { status: "draft", sentOn: null, approvedOn: null, pieces: [] },
        TODAY,
      ),
    ).toEqual({ kind: "note", note: "Cuando lo envíes" });
    expect(nextDeliveryCell(null, TODAY)).toEqual({ kind: "none" });
  });

  it("describes a row of squares for screen readers", () => {
    const optica: PieceState[] = [
      { date: "2026-10-01", status: "delivered" },
      { date: "2026-10-02", status: "pending" },
      { date: "2026-10-03", status: "pending" },
      { date: "2026-10-08", status: "pending" },
    ];
    expect(squaresDescription("approved", optica, TODAY)).toBe(
      "4 piezas: 1 entregada y 3 pendientes, 2 de ellas atrasadas",
    );
    expect(
      squaresDescription(
        "approved",
        [
          { date: "2026-09-01", status: "delivered" },
          { date: "2026-09-02", status: "delivered" },
        ],
        TODAY,
      ),
    ).toBe("2 piezas, todas entregadas");
    expect(squaresDescription("sent", optica, TODAY)).toBe(
      "4 piezas planificadas que todavía no cuentan",
    );
    expect(squaresDescription("draft", optica.slice(0, 1), TODAY)).toBe(
      "1 pieza cargada en borrador",
    );
    expect(squaresDescription("draft", [], TODAY)).toBe("Sin piezas");
  });
});

describe("Cliente", () => {
  it("writes the line under the name", () => {
    expect(
      clientSubtitle({
        industry: "Cafetería de especialidad",
        clientSince: "2026-07-01",
      }),
    ).toBe("Cafetería de especialidad. Cliente desde julio de 2026.");
    expect(clientSubtitle({ industry: "Vivero.", clientSince: null })).toBe(
      "Vivero.",
    );
    expect(clientSubtitle({ industry: null, clientSince: "2025-11-01" })).toBe(
      "Cliente desde noviembre de 2025.",
    );
    expect(clientSubtitle({ industry: " ", clientSince: null })).toBeNull();
  });

  it("says the state of the month's calendar and the next action", () => {
    expect(clientMonthState("Café Lumbre", OCTOBER, null, TODAY)).toEqual({
      kind: "missing",
      text: "Todavía no hay calendario de octubre para Café Lumbre.",
      actionLabel: "Crear calendario de octubre",
    });
    expect(
      clientMonthState(
        "Café Lumbre",
        OCTOBER,
        { status: "draft", sentOn: null, approvedOn: null, pieces: [] },
        TODAY,
      ),
    ).toEqual({
      kind: "draft",
      text: "El calendario de octubre está en borrador: todavía no se lo mandaste.",
      actionLabel: "Seguir armándolo",
    });
    expect(
      clientMonthState(
        "Café Lumbre",
        OCTOBER,
        { status: "sent", sentOn: "2026-10-01", approvedOn: null, pieces: [] },
        TODAY,
      ),
    ).toEqual({
      kind: "sent",
      text: "Le mandaste el calendario de octubre el 1 oct y todavía no lo aprobó.",
      actionLabel: "Marcar como aprobado",
    });
    const approved = clientMonthState(
      "Café Lumbre",
      OCTOBER,
      approvedCalendar([{ date: "2026-10-09", status: "pending" }]),
      TODAY,
    );
    expect(approved.kind === "approved" && plainText(approved.headline)).toBe(
      "En octubre le debés 1 pieza, tenés 0 hechas sin entregar y ya le entregaste 0.",
    );
  });

  it("describes each calendar in the table", () => {
    const approved = {
      status: "approved" as const,
      sentOn: "2026-09-24",
      approvedOn: "2026-09-28",
    };
    expect(calendarRowStatus(approved, "2026-10", TODAY)).toBe(
      "Aprobado el 28 sep, en curso",
    );
    expect(
      calendarRowStatus(
        { ...approved, approvedOn: "2026-08-27" },
        "2026-09",
        TODAY,
      ),
    ).toBe("Aprobado el 27 ago");
    expect(
      calendarRowStatus(
        { status: "draft", sentOn: null, approvedOn: null },
        "2026-11",
        TODAY,
      ),
    ).toBe("Borrador, sin enviar");
    expect(
      calendarRowStatus(
        { status: "sent", sentOn: "2026-10-01", approvedOn: null },
        "2026-11",
        TODAY,
      ),
    ).toBe("Enviado el 1 oct, sin respuesta");
  });

  it("names the state of each upcoming piece", () => {
    expect(
      pieceStateLabel({ date: "2026-10-02", status: "pending" }, TODAY),
    ).toEqual({
      text: "Atrasada",
      square: "overdue",
    });
    expect(
      pieceStateLabel({ date: "2026-10-07", status: "done" }, TODAY),
    ).toEqual({
      text: "Hecha, falta entregarla",
      square: "done",
    });
    expect(
      pieceStateLabel({ date: "2026-10-10", status: "pending" }, TODAY),
    ).toEqual({
      text: "Pendiente",
      square: "pending",
    });
  });
});

describe("Calendario", () => {
  it("writes the status line of each state", () => {
    expect(calendarStatusLine(approvedCalendar([]), TODAY)).toEqual({
      lead: "Aprobado el 28 sep.",
      rest: "Las fechas y los temas quedaron fijos: acá solo cambiás el estado de cada pieza.",
    });
    expect(
      calendarStatusLine(
        { status: "draft", sentOn: null, approvedOn: null },
        TODAY,
      ),
    ).toEqual({ lead: "Borrador:", rest: "todavía no se lo mandaste." });
    const sent = (sentOn: string) =>
      calendarStatusLine({ status: "sent", sentOn, approvedOn: null }, TODAY)
        .lead;
    expect(sent("2026-10-01")).toBe("Enviado el 1 oct, hace 4 días.");
    expect(sent("2026-10-04")).toBe("Enviado ayer.");
    expect(sent(TODAY)).toBe("Enviado hoy.");
  });

  it("writes the small lines of the screen", () => {
    expect(dueLine("2026-10-08")).toBe("Para el jueves 8 de octubre");
    expect(todayLine(TODAY)).toBe("Hoy es lunes 5 de octubre");
    expect(goToMonthLabel("2026-09")).toBe("Ir a septiembre de 2026");
  });

  it("names each piece of the grid for screen readers", () => {
    const flatWhite = {
      date: "2026-10-08",
      status: "done" as const,
      format: "reel",
      network: "instagram",
      topic: "Así hacemos el flat white",
    };
    expect(pieceAriaLabel(flatWhite, "approved", TODAY)).toBe(
      "Reel en Instagram, jueves 8: Así hacemos el flat white. Hecha.",
    );
    expect(
      pieceAriaLabel(
        {
          ...flatWhite,
          date: "2026-10-02",
          status: "pending",
          format: "post",
          network: "facebook",
          topic: "Promo de octubre",
        },
        "approved",
        TODAY,
      ),
    ).toBe(
      "Post en Facebook, viernes 2: Promo de octubre. Pendiente, atrasada.",
    );
    expect(pieceAriaLabel(flatWhite, "draft", TODAY)).toBe(
      "Reel en Instagram, jueves 8: Así hacemos el flat white.",
    );
  });

  it("shows the three steps of a piece with their days", () => {
    expect(
      pieceSteps(
        { status: "done", doneOn: "2026-10-04", deliveredOn: null },
        "2026-09-28",
        TODAY,
      ),
    ).toEqual([
      {
        status: "pending",
        label: "Pendiente",
        reached: true,
        current: false,
        when: "desde que aprobó, el 28 sep",
      },
      {
        status: "done",
        label: "Hecha",
        reached: true,
        current: true,
        when: "el 4 oct",
      },
      {
        status: "delivered",
        label: "Entregada",
        reached: false,
        current: false,
        when: "todavía no",
      },
    ]);
    const today = pieceSteps(
      { status: "delivered", doneOn: TODAY, deliveredOn: TODAY },
      "2026-09-28",
      TODAY,
    );
    expect(today.map((step) => step.when)).toEqual([
      "desde que aprobó, el 28 sep",
      "hoy",
      "hoy",
    ]);
  });

  it("names the file and the button that opens it", () => {
    expect(
      assetLink("https://drive.google.com/file/d/abc/view", "flat-white.mp4"),
    ).toEqual({ label: "flat-white.mp4", openLabel: "Abrir en Drive" });
    expect(assetLink("https://docs.google.com/presentation/d/x", null)).toEqual(
      {
        label: "docs.google.com",
        openLabel: "Abrir en Drive",
      },
    );
    expect(assetLink("https://www.dropbox.com/s/abc/promo.png", " ")).toEqual({
      label: "www.dropbox.com",
      openLabel: "Abrir archivo",
    });
  });
});
