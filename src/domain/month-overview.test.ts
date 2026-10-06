import { describe, expect, it } from "vitest";
import { addMonths } from "./dates";
import {
  filterCounts,
  matchesFilter,
  monthTotals,
  newCalendarMonths,
  notCounting,
  overdueByClient,
  parseMonthParam,
  proposedNewMonth,
  sortByUrgency,
  type ClientOverview,
} from "./month-overview";
import type { PieceState } from "./pieces";
import type { PieceStatus } from "./statuses";

const TODAY = "2026-10-05";

function pieces(...states: [day: number, status: PieceStatus][]): PieceState[] {
  return states.map(([day, status]) => ({
    date: `2026-10-${String(day).padStart(2, "0")}`,
    status,
  }));
}

function approved(
  name: string,
  list: PieceState[],
  archived = false,
): ClientOverview {
  return {
    id: name,
    name,
    archived,
    calendar: {
      status: "approved",
      sentOn: "2026-09-25",
      approvedOn: "2026-09-28",
      pieces: list,
    },
  };
}

function sent(name: string, sentOn: string, count = 3): ClientOverview {
  return {
    id: name,
    name,
    archived: false,
    calendar: {
      status: "sent",
      sentOn,
      approvedOn: null,
      pieces: Array.from({ length: count }, () => ({
        date: "2026-10-20",
        status: "pending",
      })),
    },
  };
}

function draft(name: string, count = 2): ClientOverview {
  return {
    id: name,
    name,
    archived: false,
    calendar: {
      status: "draft",
      sentOn: null,
      approvedOn: null,
      pieces: Array.from({ length: count }, () => ({
        date: "2026-10-20",
        status: "pending",
      })),
    },
  };
}

function none(name: string): ClientOverview {
  return { id: name, name, archived: false, calendar: null };
}

const names = (clients: ClientOverview[]) => clients.map((c) => c.name);

describe("monthTotals", () => {
  it("counts only approved calendars of clients not archived", () => {
    const totals = monthTotals(
      [
        approved("A", pieces([2, "pending"], [8, "done"], [1, "delivered"])),
        approved("B", pieces([9, "pending"]), true),
        sent("C", "2026-10-01"),
        draft("D"),
        none("E"),
      ],
      TODAY,
    );
    expect(totals).toEqual({
      approvedCalendars: 1,
      pending: 1,
      done: 1,
      delivered: 1,
      overdue: 1,
    });
  });
});

describe("sortByUrgency", () => {
  it("puts more overdue pieces first", () => {
    const sorted = sortByUrgency(
      [
        approved(
          "Uno",
          pieces([2, "pending"], [20, "pending"], [21, "pending"]),
        ),
        approved("Dos", pieces([2, "pending"], [3, "pending"])),
      ],
      TODAY,
    );
    expect(names(sorted)).toEqual(["Dos", "Uno"]);
  });

  it("then more pending, then more done", () => {
    const sorted = sortByUrgency(
      [
        approved("Hechas", pieces([20, "done"], [21, "done"], [22, "done"])),
        approved("Pendientes", pieces([20, "pending"], [21, "pending"])),
        approved(
          "Una pendiente",
          pieces([20, "pending"], [21, "done"], [22, "done"]),
        ),
      ],
      TODAY,
    );
    expect(names(sorted)).toEqual(["Pendientes", "Una pendiente", "Hechas"]);
  });

  it("then sent (longest waiting first), drafts, no calendar, and up to date last", () => {
    const sorted = sortByUrgency(
      [
        none("Sin calendario"),
        approved("Al día", pieces([1, "delivered"], [2, "delivered"])),
        draft("Borrador"),
        sent("Enviado ayer", "2026-10-04"),
        sent("Enviado hace días", "2026-09-30"),
        approved("Con hechas", pieces([20, "done"])),
      ],
      TODAY,
    );
    expect(names(sorted)).toEqual([
      "Con hechas",
      "Enviado hace días",
      "Enviado ayer",
      "Borrador",
      "Sin calendario",
      "Al día",
    ]);
  });

  it("breaks ties by name, ignoring accents and case", () => {
    const sorted = sortByUrgency(
      [none("Óptica Zeta"), none("optica alfa"), none("Café")],
      TODAY,
    );
    expect(names(sorted)).toEqual(["Café", "optica alfa", "Óptica Zeta"]);
  });
});

describe("filters", () => {
  const late = approved("Atrasado", pieces([2, "pending"]));
  const upToDate = approved("Al día", pieces([1, "delivered"]));
  const waiting = sent("Enviado", "2026-10-01");
  const unsent = draft("Borrador");
  const nothing = none("Nada");
  const clients = [late, upToDate, waiting, unsent, nothing];

  it("counts each filter", () => {
    expect(filterCounts(clients, TODAY)).toEqual({
      all: 5,
      overdue: 1,
      awaiting: 1,
      draft: 1,
    });
  });

  it("matches by the month's calendar", () => {
    expect(matchesFilter(late, "overdue", TODAY)).toBe(true);
    expect(matchesFilter(upToDate, "overdue", TODAY)).toBe(false);
    expect(matchesFilter(waiting, "awaiting", TODAY)).toBe(true);
    expect(matchesFilter(unsent, "draft", TODAY)).toBe(true);
    expect(matchesFilter(nothing, "all", TODAY)).toBe(true);
    expect(matchesFilter(nothing, "draft", TODAY)).toBe(false);
  });
});

describe("inputs of the Clientes sentences", () => {
  it("lists overdue pieces per client in the order given", () => {
    const clients = [
      approved("Óptica", pieces([2, "pending"], [3, "pending"])),
      approved("Café", pieces([2, "pending"], [8, "done"])),
      approved("Archivado", pieces([2, "pending"]), true),
      sent("Enviado", "2026-09-01"),
    ];
    expect(overdueByClient(clients, TODAY)).toEqual([
      { name: "Óptica", overdue: 2 },
      { name: "Café", overdue: 1 },
    ]);
  });

  it("lists calendars that do not count yet, without empty ones", () => {
    expect(
      notCounting([
        draft("Zeta", 6),
        sent("Pampa", "2026-10-01", 8),
        sent("Antes", "2026-09-28", 2),
        draft("Vacío", 0),
        draft("Alfa", 1),
        approved("Aprobado", pieces([2, "pending"])),
      ]),
    ).toEqual({
      sent: [
        { name: "Antes", pieces: 2 },
        { name: "Pampa", pieces: 8 },
      ],
      draft: [
        { name: "Alfa", pieces: 1 },
        { name: "Zeta", pieces: 6 },
      ],
    });
  });
});

describe("months", () => {
  it("reads ?mes=YYYY-MM or falls back to the current month", () => {
    expect(parseMonthParam("2026-11", "2026-10")).toBe("2026-11");
    expect(parseMonthParam("2026-13", "2026-10")).toBe("2026-10");
    expect(parseMonthParam("noviembre", "2026-10")).toBe("2026-10");
    expect(parseMonthParam("1999-12", "2026-10")).toBe("2026-10");
    expect(parseMonthParam(undefined, "2026-10")).toBe("2026-10");
    expect(parseMonthParam(["2026-11"], "2026-10")).toBe("2026-10");
  });

  it("offers two months back to a year ahead, without existing calendars", () => {
    // Café Lumbre: August to November already have one.
    const offered = newCalendarMonths(
      ["2026-08", "2026-09", "2026-10", "2026-11"],
      "2026-10",
    );
    // 15 months (August 2026 to October 2027) minus the 4 taken.
    expect(offered).toHaveLength(11);
    expect(offered[0]).toBe("2026-12");
    expect(offered.at(-1)).toBe("2027-10");
  });

  it("always offers the proposed month", () => {
    const taken = Array.from({ length: 15 }, (_, i) => addMonths("2026-08", i));
    expect(newCalendarMonths(taken, "2026-10")).toEqual(["2027-11"]);
  });

  it("proposes the first month without a calendar, from the current one", () => {
    const cafeLumbre = ["2026-08", "2026-09", "2026-10", "2026-11"];
    expect(proposedNewMonth(cafeLumbre, "2026-10")).toBe("2026-12");
    expect(proposedNewMonth(["2026-11"], "2026-10")).toBe("2026-10");
    expect(proposedNewMonth(["2026-12"], "2026-12")).toBe("2027-01");
  });
});
