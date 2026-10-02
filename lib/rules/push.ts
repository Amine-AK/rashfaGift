import { localHour } from "../time";
import type { Settings } from "../settings-schema";

type PushRules = Pick<Settings, "maxPushPerWeek" | "pushQuietStartHour" | "pushQuietEndHour" | "timezone">;

/** True between quiet start (e.g. 21:00) and quiet end (e.g. 09:00), café time. */
export function isQuietHour(now: Date, s: PushRules): boolean {
  const h = localHour(now, s.timezone);
  const { pushQuietStartHour: start, pushQuietEndHour: end } = s;
  if (start === end) return false;
  return start > end ? h >= start || h < end : h >= start && h < end;
}

export type PushDecision = { ok: true } | { ok: false; reason: "quiet_hours" | "weekly_cap" };

/** Anti-spam: never at night, and at most N notifications per customer per rolling 7 days. */
export function canSendPush(sentLast7Days: number, now: Date, s: PushRules): PushDecision {
  if (isQuietHour(now, s)) return { ok: false, reason: "quiet_hours" };
  if (sentLast7Days >= s.maxPushPerWeek) return { ok: false, reason: "weekly_cap" };
  return { ok: true };
}
