import { describe, expect, it } from "vitest";
import {
  calendarDayIn,
  isCalendarDay,
  isValidTimeZone,
  resolveToday,
} from "./today";

const BUENOS_AIRES = "America/Argentina/Buenos_Aires";

describe("calendarDayIn", () => {
  it("is still the previous day in Buenos Aires before 03:00 UTC", () => {
    expect(calendarDayIn(new Date("2026-10-05T02:30:00Z"), BUENOS_AIRES)).toBe(
      "2026-10-04",
    );
    expect(
      calendarDayIn(new Date("2026-10-05T02:59:59.999Z"), BUENOS_AIRES),
    ).toBe("2026-10-04");
  });

  it("changes day at local midnight, not at UTC midnight", () => {
    expect(calendarDayIn(new Date("2026-10-05T03:00:00Z"), BUENOS_AIRES)).toBe(
      "2026-10-05",
    );
    expect(calendarDayIn(new Date("2026-10-05T02:30:00Z"), "UTC")).toBe(
      "2026-10-05",
    );
  });

  it("crosses month and year boundaries", () => {
    expect(calendarDayIn(new Date("2026-11-01T01:00:00Z"), BUENOS_AIRES)).toBe(
      "2026-10-31",
    );
    expect(calendarDayIn(new Date("2027-01-01T02:00:00Z"), BUENOS_AIRES)).toBe(
      "2026-12-31",
    );
  });
});

describe("resolveToday", () => {
  const now = new Date("2026-10-07T15:00:00Z");

  it("uses the clock in the app's time zone", () => {
    expect(
      resolveToday({
        now,
        timeZone: BUENOS_AIRES,
        fakeToday: undefined,
        isProduction: false,
      }),
    ).toBe("2026-10-07");
  });

  it("uses the fake day outside production", () => {
    expect(
      resolveToday({
        now,
        timeZone: BUENOS_AIRES,
        fakeToday: "2026-10-05",
        isProduction: false,
      }),
    ).toBe("2026-10-05");
  });

  it("ignores the fake day in production", () => {
    expect(
      resolveToday({
        now,
        timeZone: BUENOS_AIRES,
        fakeToday: "2026-10-05",
        isProduction: true,
      }),
    ).toBe("2026-10-07");
  });

  it("rejects a fake day that is not a real day", () => {
    expect(() =>
      resolveToday({
        now,
        timeZone: BUENOS_AIRES,
        fakeToday: "2026-02-30",
        isProduction: false,
      }),
    ).toThrow("APP_FAKE_TODAY");
  });
});

describe("isCalendarDay", () => {
  it("accepts real days only", () => {
    expect(isCalendarDay("2026-10-05")).toBe(true);
    expect(isCalendarDay("2028-02-29")).toBe(true);
    expect(isCalendarDay("2026-02-29")).toBe(false);
    expect(isCalendarDay("2026-04-31")).toBe(false);
    expect(isCalendarDay("2026-13-01")).toBe(false);
    expect(isCalendarDay("2026-10-5")).toBe(false);
    expect(isCalendarDay("2026-10-05T00:00")).toBe(false);
  });
});

describe("isValidTimeZone", () => {
  it("knows IANA zones", () => {
    expect(isValidTimeZone(BUENOS_AIRES)).toBe(true);
    expect(isValidTimeZone("Mars/Olympus_Mons")).toBe(false);
  });
});
