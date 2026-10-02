/**
 * Time-zone aware helpers. Every business rule ("next day", "this month",
 * "quiet hours") is evaluated in the café's zone (Africa/Casablanca by default),
 * which shifts by an hour around Ramadan. So we always go through the IANA
 * database via Intl and never hard-code an offset.
 */

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string) {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(tz, f);
  }
  return f;
}

export type LocalParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

export function localParts(date: Date, tz: string): LocalParts {
  const out: Record<string, number> = {};
  for (const p of formatter(tz).formatToParts(date)) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    hour: out.hour === 24 ? 0 : out.hour,
    minute: out.minute,
    second: out.second,
  };
}

/** Offset of `tz` from UTC at `date`, in milliseconds (positive east of Greenwich). */
export function tzOffsetMs(date: Date, tz: string): number {
  const p = localParts(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** The UTC instant at which the local wall-clock time y-m-d h:mi happens in `tz`. */
export function zonedTime(year: number, month: number, day: number, hour: number, minute: number, tz: string): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - tzOffsetMs(new Date(guess), tz);
  const second = guess - tzOffsetMs(new Date(first), tz);
  return new Date(second);
}

export function startOfLocalDay(date: Date, tz: string): Date {
  const p = localParts(date, tz);
  return zonedTime(p.year, p.month, p.day, 0, 0, tz);
}

/** Local midnight `days` days after the local day containing `date`. */
export function addLocalDays(date: Date, days: number, tz: string): Date {
  const p = localParts(date, tz);
  const shifted = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return zonedTime(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate(), 0, 0, tz);
}

export function startOfNextLocalDay(date: Date, tz: string): Date {
  return addLocalDays(date, 1, tz);
}

export function startOfLocalMonth(date: Date, tz: string): Date {
  const p = localParts(date, tz);
  return zonedTime(p.year, p.month, 1, 0, 0, tz);
}

export function localHour(date: Date, tz: string): number {
  return localParts(date, tz).hour;
}

/** 0 = Monday … 6 = Sunday, in the café's zone. */
export function localWeekday(date: Date, tz: string): number {
  const p = localParts(date, tz);
  return (new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay() + 6) % 7;
}

export function localDateKey(date: Date, tz: string): string {
  const p = localParts(date, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function isSameLocalDay(a: Date, b: Date, tz: string): boolean {
  return localDateKey(a, tz) === localDateKey(b, tz);
}

/** Parse a "YYYY-MM-DDTHH:mm" value from a datetime-local input as café-local time. */
export function parseLocalDateTime(value: string, tz: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  return zonedTime(+m[1], +m[2], +m[3], +m[4], +m[5], tz);
}

/** Format a Date as "YYYY-MM-DDTHH:mm" in café-local time (for datetime-local inputs). */
export function toLocalInputValue(date: Date, tz: string): string {
  const p = localParts(date, tz);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;
