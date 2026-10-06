// Calendar days ("YYYY-MM-DD") and months ("YYYY-MM"): arithmetic, the month
// grid and the Spanish forms of the design ("vie 2 oct", "el 28 sep").
// A day never becomes a Date in a time zone: arithmetic uses UTC day numbers,
// and the names come from tables (Intl writes "sept." where the design says
// "sep").
import type { CalendarDay } from "./today";

/** A month: "YYYY-MM". */
export type MonthKey = string;

export const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;
const MONTHS_SHORT = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;
// Weeks start on Monday.
const WEEKDAYS = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
] as const;
export const WEEKDAYS_SHORT = [
  "lun",
  "mar",
  "mié",
  "jue",
  "vie",
  "sáb",
  "dom",
] as const;

const MS_PER_DAY = 86_400_000;
const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

function item<T>(list: readonly T[], index: number): T {
  const value = list[index];
  if (value === undefined) throw new RangeError(`No item at ${index}`);
  return value;
}

function parts(day: CalendarDay) {
  const [year, month, date] = day.split("-").map(Number);
  if (!year || !month || !date) throw new RangeError(`Not a day: ${day}`);
  return { year, month, date };
}

function toDayNumber(day: CalendarDay): number {
  const { year, month, date } = parts(day);
  return Date.UTC(year, month - 1, date) / MS_PER_DAY;
}

function fromDayNumber(dayNumber: number): CalendarDay {
  return new Date(dayNumber * MS_PER_DAY).toISOString().slice(0, 10);
}

export function addDays(day: CalendarDay, days: number): CalendarDay {
  return fromDayNumber(toDayNumber(day) + days);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: CalendarDay, to: CalendarDay): number {
  return toDayNumber(to) - toDayNumber(from);
}

/** 0 for Monday … 6 for Sunday. */
export function weekdayIndex(day: CalendarDay): number {
  return (new Date(toDayNumber(day) * MS_PER_DAY).getUTCDay() + 6) % 7;
}

export function dayOfMonth(day: CalendarDay): number {
  return parts(day).date;
}

export function isMonthKey(value: string): value is MonthKey {
  return MONTH_PATTERN.test(value);
}

export function monthOf(day: CalendarDay): MonthKey {
  return day.slice(0, 7);
}

export function firstDayOf(month: MonthKey): CalendarDay {
  return `${month}-01`;
}

export function addMonths(month: MonthKey, months: number): MonthKey {
  const [year, monthNumber] = month.split("-").map(Number);
  const index = (year ?? 0) * 12 + (monthNumber ?? 1) - 1 + months;
  const newYear = Math.floor(index / 12);
  const newMonth = (index % 12) + 1;
  return `${String(newYear).padStart(4, "0")}-${String(newMonth).padStart(2, "0")}`;
}

export function lastDayOf(month: MonthKey): CalendarDay {
  return addDays(firstDayOf(addMonths(month, 1)), -1);
}

// ---------------------------------------------------------------------------
// Spanish forms

/** "vie 2 oct" */
export function shortDay(day: CalendarDay): string {
  const { month, date } = parts(day);
  return `${item(WEEKDAYS_SHORT, weekdayIndex(day))} ${date} ${item(MONTHS_SHORT, month - 1)}`;
}

/** "28 sep" (the design writes "el 28 sep") */
export function shortDate(day: CalendarDay): string {
  const { month, date } = parts(day);
  return `${date} ${item(MONTHS_SHORT, month - 1)}`;
}

/** "jueves 8 de octubre" */
export function longDay(day: CalendarDay): string {
  return `${weekdayAndDay(day)} de ${item(MONTHS, parts(day).month - 1)}`;
}

/** "viernes 2" */
export function weekdayAndDay(day: CalendarDay): string {
  return `${item(WEEKDAYS, weekdayIndex(day))} ${dayOfMonth(day)}`;
}

/** "octubre" */
export function monthName(month: MonthKey): string {
  const [, monthNumber] = month.split("-").map(Number);
  return item(MONTHS, (monthNumber ?? 0) - 1);
}

/** "Octubre 2026" */
export function monthTitle(month: MonthKey): string {
  const name = monthName(month);
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${month.slice(0, 4)}`;
}

/** "octubre de 2026" */
export function monthOfYear(month: MonthKey): string {
  return `${monthName(month)} de ${month.slice(0, 4)}`;
}

/** "hoy", "ayer" or "hace 4 días", from `day` to `today`. */
export function daysAgo(day: CalendarDay, today: CalendarDay): string {
  const days = daysBetween(day, today);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  return `hace ${days} días`;
}

// ---------------------------------------------------------------------------
// Month grid

export type GridDay = { day: CalendarDay; inMonth: boolean };

/**
 * The weeks of a month, Monday to Sunday. Days of the previous and next
 * months fill the first and last weeks.
 */
export function monthGrid(month: MonthKey): GridDay[][] {
  const first = firstDayOf(month);
  const last = lastDayOf(month);
  const start = addDays(first, -weekdayIndex(first));
  const end = addDays(last, 6 - weekdayIndex(last));
  const weeks: GridDay[][] = [];
  for (let day = start; day <= end; day = addDays(day, 7)) {
    weeks.push(
      Array.from({ length: 7 }, (_, offset) => {
        const current = addDays(day, offset);
        return { day: current, inMonth: monthOf(current) === month };
      }),
    );
  }
  return weeks;
}
