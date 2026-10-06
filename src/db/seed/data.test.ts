import { describe, expect, it } from "vitest";
import { isFormat, isNetwork } from "@/domain/catalog";
import { isCalendarDay } from "@/domain/today";
import { seedClients, type SeedCalendar, type SeedPiece } from "./data";

// The day the mockups show as "today".
const TODAY = "2026-10-05";
const OCTOBER = "2026-10-01";

function client(name: string) {
  const found = seedClients.find((c) => c.name === name);
  if (!found) throw new Error(`No seed client named ${name}`);
  return found;
}

function calendarOf(name: string, month: string): SeedCalendar {
  const found = client(name).calendars.find((c) => c.month === month);
  if (!found) throw new Error(`No ${month} calendar for ${name}`);
  return found;
}

function count(pieces: SeedPiece[]) {
  return {
    pieces: pieces.length,
    delivered: pieces.filter((p) => p.status === "delivered").length,
    done: pieces.filter((p) => p.status === "done").length,
    pending: pieces.filter((p) => p.status === "pending").length,
    overdue: pieces.filter((p) => p.status !== "delivered" && p.date < TODAY)
      .length,
  };
}

function overdueDates(pieces: SeedPiece[]): string[] {
  return pieces
    .filter((p) => p.status !== "delivered" && p.date < TODAY)
    .map((p) => p.date)
    .sort();
}

function firstNotDelivered(pieces: SeedPiece[]): SeedPiece | undefined {
  return [...pieces]
    .sort((a, b) => a.date.localeCompare(b.date))
    .find((p) => p.status !== "delivered");
}

describe("seed data (docs/SPEC.md, section 10)", () => {
  it("has the six clients of the mockups", () => {
    expect(seedClients.map((c) => [c.name, c.industry])).toEqual([
      ["Óptica Mirador", "Óptica"],
      ["Café Lumbre", "Cafetería de especialidad"],
      ["Vivero Las Lilas", "Vivero"],
      ["Panadería La Espiga", "Panadería"],
      ["Estudio Pampa", "Estudio de arquitectura"],
      ["Impulso Funcional", "Gimnasio"],
    ]);
  });

  it.each([
    ["Óptica Mirador", "2026-09-29", 8, 1, 0, 7, 2],
    ["Café Lumbre", "2026-09-28", 15, 3, 2, 10, 1],
    ["Vivero Las Lilas", "2026-09-30", 12, 3, 4, 5, 0],
    ["Panadería La Espiga", "2026-09-25", 12, 6, 3, 3, 0],
  ] as const)(
    "%s: October approved on %s with %i pieces",
    (name, approvedOn, pieces, delivered, done, pending, overdue) => {
      const october = calendarOf(name, OCTOBER);
      expect(october.status).toBe("approved");
      expect(october.approvedOn).toBe(approvedOn);
      expect(count(october.pieces)).toEqual({
        pieces,
        delivered,
        done,
        pending,
        overdue,
      });
    },
  );

  it("adds up to 25 owed, 9 done, 13 delivered and 3 overdue", () => {
    const counted = seedClients
      .flatMap((c) => c.calendars)
      .filter((c) => c.month === OCTOBER && c.status === "approved")
      .flatMap((c) => c.pieces);
    const { pending, done, delivered, overdue } = count(counted);
    expect({ pending, done, delivered, overdue }).toEqual({
      pending: 25,
      done: 9,
      delivered: 13,
      overdue: 3,
    });
  });

  it("has the overdue pieces on the days the mockups show", () => {
    expect(overdueDates(calendarOf("Óptica Mirador", OCTOBER).pieces)).toEqual([
      "2026-10-02",
      "2026-10-03",
    ]);
    expect(overdueDates(calendarOf("Café Lumbre", OCTOBER).pieces)).toEqual([
      "2026-10-02",
    ]);
  });

  it("starts Vivero Las Lilas and Panadería La Espiga with a done piece", () => {
    expect(
      firstNotDelivered(calendarOf("Vivero Las Lilas", OCTOBER).pieces),
    ).toMatchObject({ date: "2026-10-06", status: "done" });
    expect(
      firstNotDelivered(calendarOf("Panadería La Espiga", OCTOBER).pieces),
    ).toMatchObject({ date: "2026-10-07", status: "done" });
  });

  it("has Estudio Pampa waiting since October 1 and Impulso Funcional in draft", () => {
    const pampa = calendarOf("Estudio Pampa", OCTOBER);
    expect(pampa).toMatchObject({ status: "sent", sentOn: "2026-10-01" });
    expect(pampa.pieces).toHaveLength(8);
    const impulso = calendarOf("Impulso Funcional", OCTOBER);
    expect(impulso.status).toBe("draft");
    expect(impulso.pieces).toHaveLength(6);
  });

  it("gives Café Lumbre its data and its other calendars", () => {
    expect(client("Café Lumbre")).toMatchObject({
      contactName: "Carla Benítez, dueña",
      contactPhone: "11 5555-0142",
      networks: ["instagram", "facebook"],
      approvalNotes: "Por WhatsApp. Suele tardar dos o tres días.",
      notes:
        "Tono cercano, sin emojis en los copies. Las fotos del local las manda ella los lunes.",
      clientSince: "2026-07-01",
    });
    expect(calendarOf("Café Lumbre", OCTOBER).sentOn).toBe("2026-09-24");

    const november = calendarOf("Café Lumbre", "2026-11-01");
    expect(november.status).toBe("draft");
    expect(november.pieces).toHaveLength(4);

    const september = calendarOf("Café Lumbre", "2026-09-01");
    expect(september.approvedOn).toBe("2026-08-27");
    expect(count(september.pieces)).toMatchObject({
      pieces: 14,
      delivered: 14,
    });

    const august = calendarOf("Café Lumbre", "2026-08-01");
    expect(august.approvedOn).toBe("2026-07-29");
    expect(count(august.pieces)).toMatchObject({ pieces: 12, delivered: 12 });
  });

  it("gives Café Lumbre's October pieces their ideas and the made ones a file", () => {
    const october = calendarOf("Café Lumbre", OCTOBER).pieces;
    expect(october.every((p) => p.idea)).toBe(true);
    const made = october.filter((p) => p.doneOn);
    expect(made.map((p) => p.date)).toEqual([
      "2026-10-01",
      "2026-10-03",
      "2026-10-05",
      "2026-10-07",
      "2026-10-08",
    ]);
    expect(october.filter((p) => p.asset)).toEqual(made);
  });

  it("keeps every calendar and piece valid", () => {
    for (const seedClient of seedClients) {
      for (const calendar of seedClient.calendars) {
        expect(isCalendarDay(calendar.month)).toBe(true);
        expect(calendar.month.endsWith("-01")).toBe(true);
        expect(Boolean(calendar.sentOn)).toBe(calendar.status !== "draft");
        expect(Boolean(calendar.approvedOn)).toBe(
          calendar.status === "approved",
        );

        for (const piece of calendar.pieces) {
          const where = `${seedClient.name} ${piece.date}`;
          expect(isCalendarDay(piece.date), where).toBe(true);
          expect(piece.date.slice(0, 7), where).toBe(
            calendar.month.slice(0, 7),
          );
          expect(isNetwork(piece.network), where).toBe(true);
          expect(isFormat(piece.format), where).toBe(true);
          expect(piece.topic.length, where).toBeGreaterThan(0);
          expect(piece.topic.length, where).toBeLessThanOrEqual(120);
          expect(piece.idea?.length ?? 0, where).toBeLessThanOrEqual(2000);
          expect(Boolean(piece.doneOn), where).toBe(piece.status !== "pending");
          expect(Boolean(piece.deliveredOn), where).toBe(
            piece.status === "delivered",
          );
          if (piece.doneOn && piece.deliveredOn) {
            expect(piece.doneOn <= piece.deliveredOn, where).toBe(true);
          }
          if (calendar.status !== "approved") {
            expect(piece.status, where).toBe("pending");
          }
          if (piece.asset) {
            expect(piece.asset.url.startsWith("https://"), where).toBe(true);
          }
        }
      }
    }
  });
});
