// "Today" is a calendar day in the app's time zone, never the server's UTC
// date. These functions are pure: the current instant comes in as an argument.
// The only caller that reads the clock is src/server/today.ts.

/** A day of the calendar: "YYYY-MM-DD", with no time and no zone. */
export type CalendarDay = string;

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function isCalendarDay(value: string): value is CalendarDay {
  const match = DAY_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return (
    month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)
  );
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** The calendar day that `instant` falls on in `timeZone`. */
export function calendarDayIn(instant: Date, timeZone: string): CalendarDay {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/**
 * Today in the app's time zone. A fake day (APP_FAKE_TODAY) pins it in
 * development and tests, and is ignored in production.
 */
export function resolveToday(input: {
  now: Date;
  timeZone: string;
  fakeToday: string | undefined;
  isProduction: boolean;
}): CalendarDay {
  if (input.fakeToday !== undefined && !input.isProduction) {
    if (!isCalendarDay(input.fakeToday)) {
      throw new Error(
        `APP_FAKE_TODAY must be a valid YYYY-MM-DD day, got "${input.fakeToday}"`,
      );
    }
    return input.fakeToday;
  }
  return calendarDayIn(input.now, input.timeZone);
}
