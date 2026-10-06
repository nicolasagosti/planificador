// Acceptance: with the seed data and "today" on Monday 5 October 2026, the
// domain rules produce the texts, numbers and order of the approved mockups.
import { describe, expect, it } from "vitest";
import {
  formatOnNetwork,
  networkLegend,
  networksPhrase,
} from "@/domain/catalog";
import { monthGrid, monthTitle, shortDay } from "@/domain/dates";
import {
  filterCounts,
  monthTotals,
  notCounting,
  overdueByClient,
  proposedNewMonth,
  sortByUrgency,
  type ClientOverview,
  type OverviewCalendar,
} from "@/domain/month-overview";
import { countPieces, squares, upcoming } from "@/domain/pieces";
import { pieceActions } from "@/domain/piece-transitions";
import {
  assetLink,
  calendarCell,
  calendarHeadline,
  calendarOverdueNote,
  calendarRowStatus,
  calendarStatusLine,
  clientMonthState,
  clientOverdueLine,
  clientSubtitle,
  dueLine,
  monthHeadline,
  monthOverdueLine,
  nextDeliveryCell,
  notCountingNote,
  pieceStateLabel,
  pieceSteps,
  plainText,
  squaresDescription,
  todayLine,
} from "@/domain/phrases";
import { seedClients, type SeedCalendar, type SeedClient } from "./data";

const TODAY = "2026-10-05";
const OCTOBER = "2026-10";

function overviewCalendar(calendar: SeedCalendar): OverviewCalendar {
  return {
    status: calendar.status,
    sentOn: calendar.sentOn ?? null,
    approvedOn: calendar.approvedOn ?? null,
    pieces: calendar.pieces,
  };
}

function overview(client: SeedClient): ClientOverview {
  const october = client.calendars.find((c) => c.month === `${OCTOBER}-01`);
  return {
    id: client.name,
    name: client.name,
    archived: false,
    calendar: october ? overviewCalendar(october) : null,
  };
}

const clients = sortByUrgency(seedClients.map(overview), TODAY);

function seedClient(name: string): SeedClient {
  const found = seedClients.find((client) => client.name === name);
  if (!found) throw new Error(name);
  return found;
}

function calendarOf(name: string, month: string): SeedCalendar {
  const found = seedClient(name).calendars.find(
    (c) => c.month === `${month}-01`,
  );
  if (!found) throw new Error(`${name} ${month}`);
  return found;
}

function piece(topic: string) {
  const found = calendarOf("Café Lumbre", OCTOBER).pieces.find(
    (p) => p.topic === topic,
  );
  if (!found) throw new Error(topic);
  return {
    ...found,
    doneOn: found.doneOn ?? null,
    deliveredOn: found.deliveredOn ?? null,
  };
}

describe("01-clientes", () => {
  it("orders clients by urgency", () => {
    expect(clients.map((c) => c.name)).toEqual([
      "Óptica Mirador",
      "Café Lumbre",
      "Vivero Las Lilas",
      "Panadería La Espiga",
      "Estudio Pampa",
      "Impulso Funcional",
    ]);
  });

  it("writes the headline, the overdue line and the note", () => {
    expect(plainText(monthHeadline(monthTotals(clients, TODAY), OCTOBER))).toBe(
      "Debés 25 piezas, tenés 9 hechas sin entregar y ya entregaste 13.",
    );
    expect(monthOverdueLine(overdueByClient(clients, TODAY))).toEqual({
      lead: "3 están atrasadas:",
      rest: " 2 de Óptica Mirador y 1 de Café Lumbre.",
    });
    expect(notCountingNote(notCounting(clients))).toBe(
      "No cuentan todavía: 8 piezas de Estudio Pampa, que tiene el calendario sin aprobar, y 6 de Impulso Funcional, que sigue en borrador.",
    );
  });

  it("counts the filters", () => {
    expect(filterCounts(clients, TODAY)).toEqual({
      all: 6,
      overdue: 2,
      awaiting: 1,
      draft: 1,
    });
  });

  it("fills every row as the mockup", () => {
    const rows = clients.map((client) => {
      const counts =
        client.calendar?.status === "approved"
          ? countPieces(client.calendar.pieces, TODAY)
          : null;
      return {
        name: client.name,
        cell: calendarCell(client.calendar, TODAY),
        numbers: counts && [counts.pending, counts.done, counts.delivered],
        next: nextDeliveryCell(client.calendar, TODAY),
        squares: squaresDescription(
          client.calendar?.status ?? "draft",
          client.calendar?.pieces ?? [],
          TODAY,
        ),
      };
    });
    expect(rows).toEqual([
      {
        name: "Óptica Mirador",
        cell: { status: "approved", label: "Aprobado", detail: "el 29 sep" },
        numbers: [7, 0, 1],
        next: {
          kind: "date",
          date: "vie 2 oct",
          note: "2 atrasadas",
          overdue: true,
        },
        squares: "8 piezas: 1 entregada y 7 pendientes, 2 de ellas atrasadas",
      },
      {
        name: "Café Lumbre",
        cell: { status: "approved", label: "Aprobado", detail: "el 28 sep" },
        numbers: [10, 2, 3],
        next: {
          kind: "date",
          date: "vie 2 oct",
          note: "1 atrasada",
          overdue: true,
        },
        squares:
          "15 piezas: 3 entregadas, 2 hechas y 10 pendientes, 1 de ellas atrasada",
      },
      {
        name: "Vivero Las Lilas",
        cell: { status: "approved", label: "Aprobado", detail: "el 30 sep" },
        numbers: [5, 4, 3],
        next: {
          kind: "date",
          date: "mar 6 oct",
          note: "ya está hecha",
          overdue: false,
        },
        squares: "12 piezas: 3 entregadas, 4 hechas y 5 pendientes",
      },
      {
        name: "Panadería La Espiga",
        cell: { status: "approved", label: "Aprobado", detail: "el 25 sep" },
        numbers: [3, 3, 6],
        next: {
          kind: "date",
          date: "mié 7 oct",
          note: "ya está hecha",
          overdue: false,
        },
        squares: "12 piezas: 6 entregadas, 3 hechas y 3 pendientes",
      },
      {
        name: "Estudio Pampa",
        cell: {
          status: "sent",
          label: "Enviado",
          detail: "hace 4 días, sin respuesta",
        },
        numbers: null,
        next: { kind: "note", note: "Cuando apruebe" },
        squares: "8 piezas planificadas que todavía no cuentan",
      },
      {
        name: "Impulso Funcional",
        cell: { status: "draft", label: "Borrador", detail: "sin enviar" },
        numbers: null,
        next: { kind: "note", note: "Cuando lo envíes" },
        squares: "6 piezas cargadas en borrador",
      },
    ]);
  });

  it("draws the squares of Café Lumbre in date order", () => {
    expect(
      squares("approved", calendarOf("Café Lumbre", OCTOBER).pieces, TODAY),
    ).toEqual([
      "delivered",
      "overdue",
      "delivered",
      "delivered",
      "done",
      "done",
      ...Array(9).fill("pending"),
    ]);
  });

  it("says what day it is", () => {
    expect(todayLine(TODAY)).toBe("Hoy es lunes 5 de octubre");
  });
});

describe("02-cliente: Café Lumbre", () => {
  const cafe = seedClient("Café Lumbre");
  const october = calendarOf("Café Lumbre", OCTOBER);

  it("writes the line under the name and the month's sentence", () => {
    expect(
      clientSubtitle({
        industry: cafe.industry,
        clientSince: cafe.clientSince ?? null,
      }),
    ).toBe("Cafetería de especialidad. Cliente desde julio de 2026.");
    const state = clientMonthState(
      cafe.name,
      OCTOBER,
      overviewCalendar(october),
      TODAY,
    );
    expect(state.kind === "approved" && plainText(state.headline)).toBe(
      "En octubre le debés 10 piezas, tenés 2 hechas sin entregar y ya le entregaste 3.",
    );
    expect(clientOverdueLine(october.pieces, TODAY)).toEqual({
      lead: "1 está atrasada:",
      rest: " el post de Facebook del viernes 2.",
    });
  });

  it("lists the calendars from the newest", () => {
    const rows = [...cafe.calendars]
      .sort((a, b) => b.month.localeCompare(a.month))
      .map((calendar) => [
        monthTitle(calendar.month.slice(0, 7)),
        calendarRowStatus(
          overviewCalendar(calendar),
          calendar.month.slice(0, 7),
          TODAY,
        ),
        squaresDescription(calendar.status, calendar.pieces, TODAY),
      ]);
    expect(rows).toEqual([
      [
        "Noviembre 2026",
        "Borrador, sin enviar",
        "4 piezas cargadas en borrador",
      ],
      [
        "Octubre 2026",
        "Aprobado el 28 sep, en curso",
        "15 piezas: 3 entregadas, 2 hechas y 10 pendientes, 1 de ellas atrasada",
      ],
      ["Septiembre 2026", "Aprobado el 27 ago", "14 piezas, todas entregadas"],
      ["Agosto 2026", "Aprobado el 29 jul", "12 piezas, todas entregadas"],
    ]);
  });

  it("shows what comes next in October", () => {
    expect(
      upcoming(october.pieces).map((p) => [
        shortDay(p.date),
        formatOnNetwork(p.format, p.network),
        p.topic,
        pieceStateLabel(p, TODAY).text,
      ]),
    ).toEqual([
      ["vie 2 oct", "Post en Facebook", "Promo de octubre", "Atrasada"],
      [
        "mié 7 oct",
        "Post en Facebook",
        "Horarios del feriado",
        "Hecha, falta entregarla",
      ],
      [
        "jue 8 oct",
        "Reel en Instagram",
        "Así hacemos el flat white",
        "Hecha, falta entregarla",
      ],
      [
        "sáb 10 oct",
        "Historia en Instagram",
        "Encuesta: ¿frío o caliente?",
        "Pendiente",
      ],
      [
        "mar 13 oct",
        "Post en Instagram",
        "Nuevo blend de Colombia",
        "Pendiente",
      ],
    ]);
  });

  it("writes the client data and proposes the next calendar", () => {
    expect(networksPhrase(cafe.networks)).toBe("Instagram y Facebook");
    expect(
      proposedNewMonth(
        cafe.calendars.map((c) => c.month.slice(0, 7)),
        OCTOBER,
      ),
    ).toBe("2026-12");
  });
});

describe("03-calendario: Café Lumbre, October", () => {
  const october = calendarOf("Café Lumbre", OCTOBER);
  const approvedOn = october.approvedOn ?? "";

  it("writes the status line, the headline and the overdue note", () => {
    expect(calendarStatusLine(overviewCalendar(october), TODAY).lead).toBe(
      "Aprobado el 28 sep.",
    );
    const counts = countPieces(october.pieces, TODAY);
    expect(plainText(calendarHeadline(counts, OCTOBER))).toBe(
      "Debés 10 piezas, tenés 2 hechas sin entregar y ya entregaste 3.",
    );
    expect(calendarOverdueNote(counts.overdue).text).toBe("1 está atrasada.");
    expect(networkLegend(october.pieces.map((p) => p.network))).toBe(
      "IG es Instagram y FB es Facebook",
    );
  });

  it("marks today on Monday of the second week", () => {
    expect(monthGrid(OCTOBER)[1]?.[0]).toEqual({ day: TODAY, inMonth: true });
  });

  it("shows the done piece of 03-calendario.png", () => {
    const flatWhite = piece("Así hacemos el flat white");
    expect(formatOnNetwork(flatWhite.format, flatWhite.network)).toBe(
      "Reel en Instagram",
    );
    expect(dueLine(flatWhite.date)).toBe("Para el jueves 8 de octubre");
    expect(pieceSteps(flatWhite, approvedOn, TODAY).map((s) => s.when)).toEqual(
      ["desde que aprobó, el 28 sep", "el 4 oct", "todavía no"],
    );
    expect(pieceActions(flatWhite.status)).toMatchObject({
      forward: { label: "Marcar como entregada" },
      back: { label: "Volver a pendiente" },
    });
    expect(
      assetLink(flatWhite.asset?.url ?? "", flatWhite.asset?.name ?? null),
    ).toEqual({
      label: "flat-white.mp4",
      openLabel: "Abrir en Drive",
    });
  });

  it("shows the overdue piece of 03-calendario-pieza-atrasada.png", () => {
    const promo = piece("Promo de octubre");
    expect(pieceStateLabel(promo, TODAY).text).toBe("Atrasada");
    expect(pieceSteps(promo, approvedOn, TODAY).map((s) => s.when)).toEqual([
      "desde que aprobó, el 28 sep",
      "todavía no",
      "todavía no",
    ]);
    expect(pieceActions(promo.status).forward?.label).toBe("Marcar como hecha");
    expect(promo.asset).toBeUndefined();
  });

  it("shows the delivered piece of 03-calendario-pieza-entregada.png", () => {
    const carta = piece("Carta de primavera");
    expect(dueLine(carta.date)).toBe("Para el lunes 5 de octubre");
    expect(pieceSteps(carta, approvedOn, TODAY).map((s) => s.when)).toEqual([
      "desde que aprobó, el 28 sep",
      "el 1 oct",
      "el 2 oct",
    ]);
    expect(pieceActions(carta.status)).toMatchObject({
      forward: null,
      back: { label: "Volver a hecha" },
      finished: "Lista. No queda nada por hacer con esta pieza.",
    });
    expect(
      assetLink(carta.asset?.url ?? "", carta.asset?.name ?? null).label,
    ).toBe("carta-primavera.zip");
  });
});
