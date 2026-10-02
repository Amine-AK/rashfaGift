import { describe, expect, it } from "vitest";
import { defaultSettings as s } from "@/lib/settings-schema";
import { addPoints, applyChoice, evaluateVisit } from "@/lib/rules/visits";
import { drawGift, giftStatus, mysteryGiftWindow, welcomeGiftWindow, type PoolGift } from "@/lib/rules/gifts";
import { levelFor, nextLevel } from "@/lib/rules/levels";
import { canSendPush, isQuietHour } from "@/lib/rules/push";
import { canClaimFlash, flashState, isTargeted, type FlashOffer } from "@/lib/rules/flash";
import { isBirthdayToday, isWinbackDue, referralAllowed } from "@/lib/rules/engagement";

const at = (iso: string) => new Date(iso);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

describe("visit validation", () => {
  const now = at("2026-10-02T14:00:00Z");

  it("rejects orders below the minimum amount", () => {
    expect(evaluateVisit({ amount: 14.99, lastCountedVisitAt: null, now }, s)).toEqual({ counted: false, reason: "below_min", minAmount: 15 });
    expect(evaluateVisit({ amount: 15, lastCountedVisitAt: null, now }, s)).toEqual({ counted: true });
  });

  it("rejects NaN and negative amounts", () => {
    expect(evaluateVisit({ amount: Number.NaN, lastCountedVisitAt: null, now }, s).counted).toBe(false);
    expect(evaluateVisit({ amount: -20, lastCountedVisitAt: null, now }, s).counted).toBe(false);
  });

  it("counts at most one visit per cooldown window", () => {
    const last = new Date(now.getTime() - 3.5 * HOUR);
    const res = evaluateVisit({ amount: 40, lastCountedVisitAt: last, now }, s);
    expect(res).toEqual({ counted: false, reason: "cooldown", nextEligibleAt: new Date(last.getTime() + 4 * HOUR) });
    expect(evaluateVisit({ amount: 40, lastCountedVisitAt: new Date(now.getTime() - 4 * HOUR), now }, s)).toEqual({ counted: true });
  });

  it("follows the configured cooldown", () => {
    const last = new Date(now.getTime() - 2 * HOUR);
    expect(evaluateVisit({ amount: 40, lastCountedVisitAt: last, now }, { ...s, visitCooldownHours: 1 }).counted).toBe(true);
  });
});

describe("discount now or save it", () => {
  it("discount gives the instant percentage and no point", () => {
    expect(applyChoice(2, "discount", s)).toEqual({ points: 2, giftsUnlocked: 0, discountPercent: 20 });
  });

  it("save adds a point, and the third one unlocks a gift and resets the count", () => {
    expect(applyChoice(0, "save", s)).toEqual({ points: 1, giftsUnlocked: 0, discountPercent: 0 });
    expect(applyChoice(2, "save", s)).toEqual({ points: 0, giftsUnlocked: 1, discountPercent: 0 });
  });

  it("bonus points can unlock gifts too", () => {
    expect(addPoints(2, 4, s)).toEqual({ points: 0, giftsUnlocked: 2, discountPercent: 0 });
  });
});

describe("mystery gift draw", () => {
  const pool: PoolGift[] = [
    { id: "cookie", tier: "common", weight: 70, active: true },
    { id: "coffee", tier: "medium", weight: 25, active: true },
    { id: "crepe", tier: "rare", weight: 5, active: true },
    { id: "retired", tier: "common", weight: 50, active: false },
  ];

  it("maps random numbers onto weights", () => {
    expect(drawGift(pool, { rareGivenThisMonth: 0, rareMonthlyCap: 4 }, () => 0)?.id).toBe("cookie");
    expect(drawGift(pool, { rareGivenThisMonth: 0, rareMonthlyCap: 4 }, () => 69)?.id).toBe("cookie");
    expect(drawGift(pool, { rareGivenThisMonth: 0, rareMonthlyCap: 4 }, () => 70)?.id).toBe("coffee");
    expect(drawGift(pool, { rareGivenThisMonth: 0, rareMonthlyCap: 4 }, () => 99)?.id).toBe("crepe");
  });

  it("never draws inactive gifts", () => {
    for (let r = 0; r < 100; r++) {
      expect(drawGift(pool, { rareGivenThisMonth: 0, rareMonthlyCap: 4 }, () => r)?.id).not.toBe("retired");
    }
  });

  it("stops drawing rare gifts once the monthly cap is reached", () => {
    const capped = { rareGivenThisMonth: 4, rareMonthlyCap: 4 };
    const seen = new Set<string>();
    for (let r = 0; r < 95; r++) seen.add(drawGift(pool, capped, () => r)!.id);
    expect(seen).toEqual(new Set(["cookie", "coffee"]));
  });

  it("matches the configured odds over many draws", () => {
    let seed = 42;
    const rng = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed % n;
    };
    const counts: Record<string, number> = {};
    for (let i = 0; i < 20_000; i++) {
      const g = drawGift(pool, { rareGivenThisMonth: 0, rareMonthlyCap: 1e9 }, rng)!;
      counts[g.id] = (counts[g.id] ?? 0) + 1;
    }
    expect(counts.cookie / 20_000).toBeCloseTo(0.7, 1);
    expect(counts.coffee / 20_000).toBeCloseTo(0.25, 1);
    expect(counts.crepe / 20_000).toBeCloseTo(0.05, 1);
  });

  it("returns null for an empty pool", () => {
    expect(drawGift([], { rareGivenThisMonth: 0, rareMonthlyCap: 1 }, () => 0)).toBeNull();
  });
});

describe("gift windows and status", () => {
  const tz = s.timezone;

  it("a mystery gift unlocked in the evening opens at the next local midnight", () => {
    const unlocked = at("2026-10-02T21:30:00Z"); // 22:30 in Casablanca
    const w = mysteryGiftWindow(unlocked, s);
    expect(w.availableFrom.toISOString()).toBe("2026-10-02T23:00:00.000Z");
    expect(w.expiresAt.toISOString()).toBe("2026-10-16T23:00:00.000Z"); // 14 days
  });

  it("cannot be claimed the same day, can be the next day", () => {
    const unlocked = at("2026-10-02T10:00:00Z");
    const g = { ...mysteryGiftWindow(unlocked, s), claimedAt: null, usesLeft: 1, lastUsedAt: null };
    expect(giftStatus(g, at("2026-10-02T20:00:00Z"), tz)).toBe("locked");
    expect(giftStatus(g, at("2026-10-03T08:00:00Z"), tz)).toBe("available");
    expect(giftStatus(g, at("2026-10-20T08:00:00Z"), tz)).toBe("expired");
    expect(giftStatus({ ...g, claimedAt: at("2026-10-03T08:00:00Z"), usesLeft: 0 }, at("2026-10-04T08:00:00Z"), tz)).toBe("claimed");
  });

  it("multi-use gifts: once per local day, with enough days for every use", () => {
    const w = mysteryGiftWindow(at("2026-10-02T10:00:00Z"), { ...s, giftValidityDays: 3 }, 7);
    expect((w.expiresAt.getTime() - w.availableFrom.getTime()) / DAY).toBe(7);
    const g = { ...w, claimedAt: null, usesLeft: 6, lastUsedAt: at("2026-10-03T09:00:00Z") };
    expect(giftStatus(g, at("2026-10-03T18:00:00Z"), tz)).toBe("used_today");
    expect(giftStatus(g, at("2026-10-04T09:00:00Z"), tz)).toBe("available");
  });

  it("welcome gift: locked until tomorrow, valid 7 days", () => {
    const w = welcomeGiftWindow(at("2026-10-02T15:00:00Z"), s);
    expect(w.availableFrom.toISOString()).toBe("2026-10-02T23:00:00.000Z");
    expect(w.expiresAt.toISOString()).toBe("2026-10-09T23:00:00.000Z");
  });
});

describe("levels", () => {
  it("uses the configured thresholds", () => {
    expect(levelFor(0, s)).toBe("newcomer");
    expect(levelFor(4, s)).toBe("newcomer");
    expect(levelFor(5, s)).toBe("regular");
    expect(levelFor(15, s)).toBe("family");
    expect(nextLevel(3, s)).toEqual({ level: "regular", visitsToGo: 2 });
    expect(nextLevel(20, s)).toBeNull();
    expect(levelFor(3, { levelRegularMinVisits: 3, levelFamilyMinVisits: 10 })).toBe("regular");
  });
});

describe("push anti-spam", () => {
  it("respects quiet hours (21:00 to 09:00, café time)", () => {
    expect(isQuietHour(at("2026-10-02T07:59:00Z"), s)).toBe(true); // 08:59 local
    expect(isQuietHour(at("2026-10-02T08:00:00Z"), s)).toBe(false); // 09:00 local
    expect(isQuietHour(at("2026-10-02T19:59:00Z"), s)).toBe(false); // 20:59 local
    expect(isQuietHour(at("2026-10-02T20:00:00Z"), s)).toBe(true); // 21:00 local
  });

  it("caps notifications per customer per week", () => {
    const afternoon = at("2026-10-02T14:00:00Z");
    expect(canSendPush(1, afternoon, s)).toEqual({ ok: true });
    expect(canSendPush(2, afternoon, s)).toEqual({ ok: false, reason: "weekly_cap" });
    expect(canSendPush(0, at("2026-10-02T22:00:00Z"), s)).toEqual({ ok: false, reason: "quiet_hours" });
  });
});

describe("flash offers", () => {
  const offer: FlashOffer = {
    startsAt: at("2026-10-02T14:00:00Z"),
    endsAt: at("2026-10-02T15:00:00Z"),
    maxQty: 10,
    claimedQty: 0,
    stoppedAt: null,
    target: "all",
    targetLevel: null,
  };
  const during = at("2026-10-02T14:30:00Z");

  it("has a lifecycle", () => {
    expect(flashState(offer, at("2026-10-02T13:00:00Z"))).toBe("scheduled");
    expect(flashState(offer, during)).toBe("live");
    expect(flashState({ ...offer, claimedQty: 10 }, during)).toBe("sold_out");
    expect(flashState(offer, at("2026-10-02T15:00:00Z"))).toBe("ended");
    expect(flashState({ ...offer, stoppedAt: during }, during)).toBe("ended");
  });

  it("can be claimed once per customer, while stock lasts", () => {
    expect(canClaimFlash(offer, { now: during, alreadyClaimed: false, targeted: true })).toEqual({ ok: true });
    expect(canClaimFlash(offer, { now: during, alreadyClaimed: true, targeted: true })).toEqual({ ok: false, reason: "already_claimed" });
    expect(canClaimFlash({ ...offer, claimedQty: 10 }, { now: during, alreadyClaimed: false, targeted: true })).toEqual({ ok: false, reason: "sold_out" });
    expect(canClaimFlash(offer, { now: during, alreadyClaimed: false, targeted: false })).toEqual({ ok: false, reason: "not_targeted" });
  });

  it("targets levels and inactive customers", () => {
    const c = { level: "regular" as const, lastVisitAt: at("2026-09-01T10:00:00Z"), createdAt: at("2026-08-01T10:00:00Z") };
    expect(isTargeted({ target: "level", targetLevel: "regular" }, c, during)).toBe(true);
    expect(isTargeted({ target: "level", targetLevel: "family" }, c, during)).toBe(false);
    expect(isTargeted({ target: "inactive", targetLevel: null }, c, during)).toBe(true);
    expect(isTargeted({ target: "inactive", targetLevel: null }, { ...c, lastVisitAt: at("2026-09-30T10:00:00Z") }, during)).toBe(false);
  });
});

describe("win-back, referral and birthday", () => {
  const now = at("2026-10-30T12:00:00Z");

  it("win-back is due after N days away, once per inactivity period", () => {
    const away = { lastVisitAt: at("2026-10-01T12:00:00Z"), createdAt: at("2026-09-01T12:00:00Z"), lastWinbackAt: null };
    expect(isWinbackDue(away, now, s)).toBe(true);
    expect(isWinbackDue({ ...away, lastWinbackAt: at("2026-10-25T12:00:00Z") }, now, s)).toBe(false);
    // Came back after the last win-back, then left again: a new period.
    expect(isWinbackDue({ ...away, lastWinbackAt: at("2026-09-20T12:00:00Z") }, now, s)).toBe(true);
    expect(isWinbackDue({ ...away, lastVisitAt: at("2026-10-20T12:00:00Z") }, now, s)).toBe(false);
  });

  it("limits rewarded referrals per month", () => {
    expect(referralAllowed(4, s)).toBe(true);
    expect(referralAllowed(5, s)).toBe(false);
  });

  it("birthday gift once a year, in café time", () => {
    const bday = new Date("1995-10-30T00:00:00Z");
    expect(isBirthdayToday(bday, null, now, s.timezone)).toBe(true);
    expect(isBirthdayToday(bday, 2026, now, s.timezone)).toBe(false);
    expect(isBirthdayToday(bday, null, at("2026-10-29T23:30:00Z"), s.timezone)).toBe(true); // 00:30 local on the 30th
    expect(isBirthdayToday(new Date("2000-02-29T00:00:00Z"), null, at("2027-02-28T12:00:00Z"), s.timezone)).toBe(true);
    expect(isBirthdayToday(null, null, now, s.timezone)).toBe(false);
  });
});
