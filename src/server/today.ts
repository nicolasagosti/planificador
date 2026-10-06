import "server-only";
import { resolveToday, type CalendarDay } from "@/domain/today";
import { appTimeZone, fakeToday, isProduction } from "@/lib/env";

/**
 * Today in the app's time zone. This is the one place that reads the clock to
 * decide what day it is; everything else receives the day from here.
 */
export function today(): CalendarDay {
  return resolveToday({
    now: new Date(),
    timeZone: appTimeZone(),
    fakeToday: fakeToday(),
    isProduction: isProduction(),
  });
}
