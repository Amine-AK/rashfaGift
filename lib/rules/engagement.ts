import { DAY, localParts } from "../time";
import type { Settings } from "../settings-schema";

/** Referral bonus: both friends get +1 point, up to N rewarded referrals per month for the referrer. */
export function referralAllowed(rewardedThisMonth: number, s: Pick<Settings, "maxReferralsPerMonth">): boolean {
  return rewardedThisMonth < s.maxReferralsPerMonth;
}

/**
 * Win-back is due when the customer has been away `winbackDays` and has not
 * already received one since their last visit (once per inactivity period).
 */
export function isWinbackDue(
  c: { lastVisitAt: Date | null; createdAt: Date; lastWinbackAt: Date | null },
  now: Date,
  s: Pick<Settings, "winbackDays">,
): boolean {
  const lastSeen = c.lastVisitAt ?? c.createdAt;
  if (now.getTime() - lastSeen.getTime() < s.winbackDays * DAY) return false;
  return !c.lastWinbackAt || c.lastWinbackAt < lastSeen;
}

/** Birthday gift: on the local birthday, once per year (29 Feb celebrates on 28 Feb in other years). */
export function isBirthdayToday(birthday: Date | null, lastGiftYear: number | null, now: Date, tz: string): boolean {
  if (!birthday) return false;
  const today = localParts(now, tz);
  if (lastGiftYear === today.year) return false;
  const month = birthday.getUTCMonth() + 1;
  let day = birthday.getUTCDate();
  const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  if (month === 2 && day === 29 && !leap(today.year)) day = 28;
  return today.month === month && today.day === day;
}
