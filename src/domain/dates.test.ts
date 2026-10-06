import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  daysAgo,
  daysBetween,
  firstDayOf,
  isMonthKey,
  lastDayOf,
  longDay,
  monthGrid,
  monthName,
  monthOf,
  monthOfYear,
  monthTitle,
  shortDate,
  shortDay,
  weekdayAndDay,
  weekdayIndex,
} from "./dates";

describe("day arithmetic", () => {
  it("adds days across months, years and leap days", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("counts the days between two days", () => {
    expect(daysBetween("2026-10-01", "2026-10-05")).toBe(4);
    expect(daysBetween("2026-10-05", "2026-10-01")).toBe(-4);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
  });

  it("starts the week on Monday", () => {
    expect(weekdayIndex("2026-10-05")).toBe(0);
    expect(weekdayIndex("2026-10-01")).toBe(3);
    expect(weekdayIndex("2026-10-04")).toBe(6);
  });
});

describe("months", () => {
  it("recognizes month keys", () => {
    expect(isMonthKey("2026-10")).toBe(true);
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("2026-1")).toBe(false);
    expect(isMonthKey("2026-10-01")).toBe(false);
  });

  it("moves across years", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-10", 14)).toBe("2027-12");
  });

  it("knows the first and last day", () => {
    expect(monthOf("2026-10-05")).toBe("2026-10");
    expect(firstDayOf("2026-10")).toBe("2026-10-01");
    expect(lastDayOf("2026-10")).toBe("2026-10-31");
    expect(lastDayOf("2026-02")).toBe("2026-02-28");
    expect(lastDayOf("2028-02")).toBe("2028-02-29");
  });
});

describe("Spanish forms of the design", () => {
  it("writes short days and dates in lowercase", () => {
    expect(shortDay("2026-10-02")).toBe("vie 2 oct");
    expect(shortDay("2026-10-07")).toBe("mié 7 oct");
    expect(shortDay("2026-10-10")).toBe("sáb 10 oct");
    expect(shortDate("2026-09-28")).toBe("28 sep");
  });

  it("writes long days and months", () => {
    expect(longDay("2026-10-08")).toBe("jueves 8 de octubre");
    expect(longDay("2026-10-05")).toBe("lunes 5 de octubre");
    expect(weekdayAndDay("2026-10-02")).toBe("viernes 2");
    expect(monthName("2026-10")).toBe("octubre");
    expect(monthTitle("2026-10")).toBe("Octubre 2026");
    expect(monthOfYear("2026-07")).toBe("julio de 2026");
  });

  it("says how long ago a day was", () => {
    expect(daysAgo("2026-10-05", "2026-10-05")).toBe("hoy");
    expect(daysAgo("2026-10-04", "2026-10-05")).toBe("ayer");
    expect(daysAgo("2026-10-01", "2026-10-05")).toBe("hace 4 días");
  });
});

describe("monthGrid", () => {
  it("draws October 2026 as the mockup: Monday 28 Sep to Sunday 1 Nov", () => {
    const weeks = monthGrid("2026-10");
    expect(weeks).toHaveLength(5);
    expect(weeks[0]?.map((d) => d.day)).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(weeks[0]?.filter((d) => !d.inMonth)).toHaveLength(3);
    expect(weeks.at(-1)?.at(-1)).toEqual({ day: "2026-11-01", inMonth: false });
  });

  it("uses six weeks when needed and starts on day 1 when it is a Monday", () => {
    expect(monthGrid("2026-08")).toHaveLength(6);
    expect(monthGrid("2026-06")[0]?.[0]).toEqual({
      day: "2026-06-01",
      inMonth: true,
    });
  });

  it("always has whole weeks", () => {
    for (const month of ["2026-02", "2026-08", "2026-10", "2027-03"]) {
      expect(monthGrid(month).every((week) => week.length === 7)).toBe(true);
    }
  });
});
