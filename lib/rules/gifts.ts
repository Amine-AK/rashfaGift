import { addLocalDays, isSameLocalDay, startOfNextLocalDay } from "../time";
import type { Settings } from "../settings-schema";

export type Tier = "common" | "medium" | "rare";
export type PoolGift = { id: string; tier: Tier; weight: number; active: boolean };

/**
 * Weighted draw from the gift pool. Rare gifts drop out of the draw once the
 * monthly cap is reached, so the budget is never exceeded.
 * `randomInt(n)` must return an integer in [0, n).
 */
export function drawGift<G extends PoolGift>(
  pool: G[],
  opts: { rareGivenThisMonth: number; rareMonthlyCap: number },
  randomInt: (n: number) => number,
): G | null {
  const eligible = pool.filter(
    (g) => g.active && g.weight > 0 && (g.tier !== "rare" || opts.rareGivenThisMonth < opts.rareMonthlyCap),
  );
  const total = eligible.reduce((sum, g) => sum + g.weight, 0);
  if (total === 0) return null;
  let r = randomInt(total);
  for (const g of eligible) {
    if (r < g.weight) return g;
    r -= g.weight;
  }
  return eligible[eligible.length - 1];
}

export type GiftWindow = { availableFrom: Date; expiresAt: Date };

/**
 * A mystery gift can never be claimed the day it unlocks: it opens at the next
 * local midnight (i.e. the customer's next visit) and stays valid N days.
 * Multi-use gifts (one per day) get at least as many days as uses.
 */
export function mysteryGiftWindow(unlockedAt: Date, s: Pick<Settings, "giftValidityDays" | "timezone">, uses = 1): GiftWindow {
  const availableFrom = startOfNextLocalDay(unlockedAt, s.timezone);
  return { availableFrom, expiresAt: addLocalDays(availableFrom, Math.max(s.giftValidityDays, uses), s.timezone) };
}

/** Welcome gift: a bounce-back offer, locked until tomorrow. */
export function welcomeGiftWindow(signupAt: Date, s: Pick<Settings, "welcomeGiftValidityDays" | "timezone">): GiftWindow {
  const availableFrom = startOfNextLocalDay(signupAt, s.timezone);
  return { availableFrom, expiresAt: addLocalDays(availableFrom, s.welcomeGiftValidityDays, s.timezone) };
}

/** Win-back and birthday gifts: usable right away, for `days` days. */
export function immediateGiftWindow(now: Date, days: number, tz: string): GiftWindow {
  return { availableFrom: now, expiresAt: addLocalDays(now, days, tz) };
}

export type GiftState = {
  availableFrom: Date;
  expiresAt: Date;
  claimedAt: Date | null;
  usesLeft: number;
  lastUsedAt: Date | null;
};

export type GiftStatus = "locked" | "available" | "used_today" | "claimed" | "expired";

export function giftStatus(g: GiftState, now: Date, tz: string): GiftStatus {
  if (g.claimedAt || g.usesLeft <= 0) return "claimed";
  if (now >= g.expiresAt) return "expired";
  if (now < g.availableFrom) return "locked";
  if (g.lastUsedAt && isSameLocalDay(g.lastUsedAt, now, tz)) return "used_today";
  return "available";
}
