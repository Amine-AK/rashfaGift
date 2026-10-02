import { describe, expect, it } from "vitest";
import {
  addLocalDays,
  isSameLocalDay,
  localHour,
  localWeekday,
  parseLocalDateTime,
  startOfLocalDay,
  startOfLocalMonth,
  startOfNextLocalDay,
  toLocalInputValue,
} from "@/lib/time";

const TZ = "Africa/Casablanca";

describe("café-local time", () => {
  it("finds local midnight in Casablanca (UTC+1 most of the year)", () => {
    const at = new Date("2026-10-02T15:30:00Z"); // 16:30 in Casablanca
    expect(startOfLocalDay(at, TZ).toISOString()).toBe("2026-10-01T23:00:00.000Z");
    expect(startOfNextLocalDay(at, TZ).toISOString()).toBe("2026-10-02T23:00:00.000Z");
  });

  it("handles the late-evening edge: 23:30 local is still 'today'", () => {
    const at = new Date("2026-10-02T22:30:00Z"); // 23:30 local
    expect(localHour(at, TZ)).toBe(23);
    expect(startOfNextLocalDay(at, TZ).toISOString()).toBe("2026-10-02T23:00:00.000Z");
  });

  it("follows the Ramadan clock change (UTC+0 during Ramadan 2026)", () => {
    // Morocco switches to UTC+0 for Ramadan (mid-Feb to late-Mar 2026).
    const ramadan = new Date("2026-03-01T12:00:00Z");
    expect(startOfLocalDay(ramadan, TZ).toISOString()).toBe("2026-03-01T00:00:00.000Z");
    const normal = new Date("2026-05-01T12:00:00Z");
    expect(startOfLocalDay(normal, TZ).toISOString()).toBe("2026-04-30T23:00:00.000Z");
  });

  it("adds whole local days across a month boundary", () => {
    const at = new Date("2026-10-30T10:00:00Z");
    expect(addLocalDays(at, 3, TZ).toISOString()).toBe("2026-11-01T23:00:00.000Z");
  });

  it("computes weekday (Mon=0) and month start", () => {
    expect(localWeekday(new Date("2026-10-05T10:00:00Z"), TZ)).toBe(0); // Monday
    expect(localWeekday(new Date("2026-10-04T10:00:00Z"), TZ)).toBe(6); // Sunday
    expect(startOfLocalMonth(new Date("2026-10-15T10:00:00Z"), TZ).toISOString()).toBe("2026-09-30T23:00:00.000Z");
  });

  it("compares local days, not UTC days", () => {
    const a = new Date("2026-10-02T23:30:00Z"); // 00:30 on Oct 3 local
    const b = new Date("2026-10-03T08:00:00Z");
    expect(isSameLocalDay(a, b, TZ)).toBe(true);
  });

  it("round-trips datetime-local input values", () => {
    const d = parseLocalDateTime("2026-10-02T15:00", TZ)!;
    expect(d.toISOString()).toBe("2026-10-02T14:00:00.000Z");
    expect(toLocalInputValue(d, TZ)).toBe("2026-10-02T15:00");
    expect(parseLocalDateTime("nope", TZ)).toBeNull();
  });
});
