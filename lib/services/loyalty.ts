import "server-only";
import { randomInt } from "node:crypto";
import { sql, type Tx } from "../db";
import type { I18nText } from "../i18n-text";
import { loadSettings, type Settings } from "../settings";
import { startOfLocalMonth } from "../time";
import { addPoints, applyChoice, evaluateVisit, type Choice } from "../rules/visits";
import { drawGift, giftStatus, mysteryGiftWindow, type GiftStatus, type Tier } from "../rules/gifts";
import { levelFor, type Level } from "../rules/levels";
import { canClaimFlash, flashState, isTargeted, type FlashState } from "../rules/flash";
import { referralAllowed } from "../rules/engagement";
import { insertGift } from "./gifts-store";

export class LoyaltyError extends Error {
  constructor(
    public code:
      | "customer_not_found"
      | "gift_not_found"
      | "gift_not_available"
      | "offer_not_found"
      | "offer_not_claimable",
    public detail?: string,
  ) {
    super(code);
  }
}

async function audit(tx: Tx, staffId: string | null, action: string, customerId: string | null, payload: object) {
  await tx`insert into audit_log (staff_id, action, customer_id, payload) values (${staffId}, ${action}, ${customerId}, ${tx.json(payload as never)})`;
}

type LockedCustomer = {
  id: string;
  firstName: string;
  points: number;
  visitCount: number;
  lastVisitAt: Date | null;
  createdAt: Date;
  referredBy: string | null;
};

async function lockCustomer(tx: Tx, customerId: string): Promise<LockedCustomer> {
  const [c] = await tx<LockedCustomer[]>`
    select id, first_name, points, visit_count, last_visit_at, created_at, referred_by
    from customers where id = ${customerId} and deleted_at is null for update`;
  if (!c) throw new LoyaltyError("customer_not_found");
  return c;
}

/**
 * Draws a mystery gift server-side and stores it. A transaction-level lock
 * serialises draws so the monthly rare-gift cap can never be overshot.
 */
export async function drawMysteryGift(tx: Tx, customerId: string, s: Settings, now: Date): Promise<string | null> {
  await tx`select pg_advisory_xact_lock(hashtext('rashfa:rare-gifts'))`;
  const [{ count }] = await tx<{ count: number }[]>`
    select count(*)::int as count from customer_gifts
    where tier = 'rare' and source = 'mystery' and created_at >= ${startOfLocalMonth(now, s.timezone)}`;
  const pool = await tx<{ id: string; tier: Tier; weight: number; active: boolean; title: I18nText; estCost: number; uses: number }[]>`
    select id, tier, weight, active, title, est_cost, uses from gift_pool where active`;
  const gift = drawGift(pool, { rareGivenThisMonth: count, rareMonthlyCap: s.rareGiftMonthlyCap }, (n) => randomInt(n));
  if (!gift) return null;
  return insertGift(tx, {
    customerId,
    source: "mystery",
    giftPoolId: gift.id,
    title: gift.title,
    tier: gift.tier,
    estCost: gift.estCost,
    uses: gift.uses,
    window: mysteryGiftWindow(now, s, gift.uses),
  });
}

/** Adds bonus points (e.g. referral) to a locked customer, unlocking gifts when a set is complete. */
async function grantPoints(tx: Tx, c: LockedCustomer, delta: number, s: Settings, now: Date): Promise<string[]> {
  const outcome = addPoints(c.points, delta, s);
  await tx`update customers set points = ${outcome.points} where id = ${c.id}`;
  c.points = outcome.points;
  const gifts: string[] = [];
  for (let i = 0; i < outcome.giftsUnlocked; i++) {
    const id = await drawMysteryGift(tx, c.id, s, now);
    if (id) gifts.push(id);
  }
  return gifts;
}

export type VisitResult =
  | { counted: false; reason: "below_min"; minAmount: number }
  | { counted: false; reason: "cooldown"; nextEligibleAt: Date }
  | {
      counted: true;
      choice: Choice;
      discountPercent: number;
      points: number;
      pointsForGift: number;
      giftsUnlocked: string[];
      level: Level;
      levelUp: boolean;
      referralBonus: boolean;
    };

/** Staff validated an order at the counter. All rules are checked here, inside one transaction. */
export async function registerVisit(
  input: { customerId: string; staffId: string; amount: number; choice: Choice },
  now = new Date(),
): Promise<VisitResult> {
  return sql.begin(async (tx) => {
    const s = await loadSettings(tx);
    const c = await lockCustomer(tx, input.customerId);
    const decision = evaluateVisit({ amount: input.amount, lastCountedVisitAt: c.lastVisitAt, now }, s);

    if (!decision.counted) {
      await tx`insert into visits (customer_id, staff_id, amount, counted, reason, created_at)
               values (${c.id}, ${input.staffId}, ${input.amount}, false, ${decision.reason}, ${now})`;
      await audit(tx, input.staffId, "visit_rejected", c.id, { amount: input.amount, reason: decision.reason });
      return decision;
    }

    const outcome = applyChoice(c.points, input.choice, s);
    const levelBefore = levelFor(c.visitCount, s);
    const isFirstVisit = c.visitCount === 0;
    await tx`insert into visits (customer_id, staff_id, amount, counted, choice, discount_percent, created_at)
             values (${c.id}, ${input.staffId}, ${input.amount}, true, ${input.choice}, ${outcome.discountPercent || null}, ${now})`;
    await tx`update customers set points = ${outcome.points}, visit_count = visit_count + 1, last_visit_at = ${now}
             where id = ${c.id}`;
    c.points = outcome.points;
    c.visitCount += 1;

    const giftsUnlocked: string[] = [];
    for (let i = 0; i < outcome.giftsUnlocked; i++) {
      const id = await drawMysteryGift(tx, c.id, s, now);
      if (id) giftsUnlocked.push(id);
    }

    // Came back after a win-back message: count it as a success.
    await tx`update winback_events set returned_at = ${now} where customer_id = ${c.id} and returned_at is null`;

    // Referral: on the friend's first counted visit, both get +1 point (within the referrer's monthly limit).
    let referralBonus = false;
    if (isFirstVisit && c.referredBy) {
      const [ref] = await tx<{ id: string }[]>`
        select id from referrals where referee_id = ${c.id} and rewarded_at is null for update`;
      if (ref) {
        const referrer = await lockCustomer(tx, c.referredBy).catch(() => null);
        if (referrer) {
          const [{ count }] = await tx<{ count: number }[]>`
            select count(*)::int as count from referrals
            where referrer_id = ${referrer.id} and rewarded_at >= ${startOfLocalMonth(now, s.timezone)}`;
          if (referralAllowed(count, s)) {
            await tx`update referrals set rewarded_at = ${now} where id = ${ref.id}`;
            giftsUnlocked.push(...(await grantPoints(tx, c, 1, s, now)));
            await grantPoints(tx, referrer, 1, s, now);
            referralBonus = true;
          }
        }
      }
    }

    const level = levelFor(c.visitCount, s);
    await audit(tx, input.staffId, "visit_counted", c.id, {
      amount: input.amount,
      choice: input.choice,
      discountPercent: outcome.discountPercent,
      giftsUnlocked,
      referralBonus,
    });
    return {
      counted: true,
      choice: input.choice,
      discountPercent: outcome.discountPercent,
      points: c.points,
      pointsForGift: s.pointsForGift,
      giftsUnlocked,
      level,
      levelUp: level !== levelBefore,
      referralBonus,
    };
  });
}

/** Staff redeems one use of a gift (QR scanned at the counter). */
export async function claimGift(input: { customerId: string; giftId: string; staffId: string }, now = new Date()) {
  return sql.begin(async (tx) => {
    const s = await loadSettings(tx);
    const [g] = await tx<{ id: string; title: I18nText; availableFrom: Date; expiresAt: Date; claimedAt: Date | null; usesLeft: number; lastUsedAt: Date | null }[]>`
      select id, title, available_from, expires_at, claimed_at, uses_left, last_used_at
      from customer_gifts where id = ${input.giftId} and customer_id = ${input.customerId} for update`;
    if (!g) throw new LoyaltyError("gift_not_found");
    const status = giftStatus(g, now, s.timezone);
    if (status !== "available") throw new LoyaltyError("gift_not_available", status);
    const usesLeft = g.usesLeft - 1;
    await tx`update customer_gifts set uses_left = ${usesLeft}, last_used_at = ${now},
               claimed_at = ${usesLeft === 0 ? now : null}, claimed_by = ${input.staffId}
             where id = ${g.id}`;
    await audit(tx, input.staffId, "gift_claimed", input.customerId, { giftId: g.id, usesLeft });
    return { title: g.title, usesLeft };
  });
}

/** Staff confirms a flash-offer claim. The offer row is locked, so "first 10" really means 10. */
export async function claimFlashOffer(input: { customerId: string; offerId: string; staffId: string }, now = new Date()) {
  return sql.begin(async (tx) => {
    const s = await loadSettings(tx);
    const c = await lockCustomer(tx, input.customerId);
    const [o] = await tx<FlashOfferRow[]>`select * from flash_offers where id = ${input.offerId} for update`;
    if (!o) throw new LoyaltyError("offer_not_found");
    const [already] = await tx`select 1 from flash_claims where offer_id = ${o.id} and customer_id = ${c.id}`;
    const targeted = isTargeted(o, { level: levelFor(c.visitCount, s), lastVisitAt: c.lastVisitAt, createdAt: c.createdAt }, now);
    const decision = canClaimFlash(o, { now, alreadyClaimed: !!already, targeted });
    if (!decision.ok) throw new LoyaltyError("offer_not_claimable", decision.reason);
    await tx`insert into flash_claims (offer_id, customer_id, staff_id, claimed_at) values (${o.id}, ${c.id}, ${input.staffId}, ${now})`;
    await tx`update flash_offers set claimed_qty = claimed_qty + 1 where id = ${o.id}`;
    await audit(tx, input.staffId, "flash_claimed", c.id, { offerId: o.id });
    return { title: o.title, reward: o.reward, left: o.maxQty - o.claimedQty - 1 };
  });
}

export type FlashOfferRow = {
  id: string;
  title: I18nText;
  reward: I18nText;
  menuItemId: string | null;
  startsAt: Date;
  endsAt: Date;
  maxQty: number;
  claimedQty: number;
  target: "all" | "level" | "inactive";
  targetLevel: Level | null;
  pushStatus: "pending" | "sent" | "skipped";
  pushedCount: number;
  stoppedAt: Date | null;
  createdAt: Date;
};

export type CustomerGift = {
  id: string;
  source: "mystery" | "welcome" | "winback" | "birthday";
  title: I18nText;
  tier: Tier | null;
  availableFrom: Date;
  expiresAt: Date;
  revealedAt: Date | null;
  claimedAt: Date | null;
  usesLeft: number;
  lastUsedAt: Date | null;
  status: GiftStatus;
};

export async function listCustomerGifts(customerId: string, s: Settings, now = new Date(), db: typeof sql | Tx = sql): Promise<CustomerGift[]> {
  const rows = await db<Omit<CustomerGift, "status">[]>`
    select id, source, title, tier, available_from, expires_at, revealed_at, claimed_at, uses_left, last_used_at
    from customer_gifts where customer_id = ${customerId}
      and (claimed_at is null or claimed_at > ${new Date(now.getTime() - 30 * 86_400_000)})
      and expires_at > ${new Date(now.getTime() - 14 * 86_400_000)}
    order by available_from desc`;
  return rows.map((g) => ({ ...g, status: giftStatus(g, now, s.timezone) }));
}

export type LiveOffer = FlashOfferRow & { state: FlashState; claimedByMe: boolean; targeted: boolean };

/** Flash offers that are live (or about to start) for this customer. */
export async function listOffersForCustomer(
  c: { id: string; visitCount: number; lastVisitAt: Date | null; createdAt: Date },
  s: Settings,
  now = new Date(),
): Promise<LiveOffer[]> {
  const rows = await sql<(FlashOfferRow & { claimedByMe: boolean })[]>`
    select o.*, exists (select 1 from flash_claims fc where fc.offer_id = o.id and fc.customer_id = ${c.id}) as claimed_by_me
    from flash_offers o
    where o.stopped_at is null and o.ends_at > ${now} and o.starts_at < ${new Date(now.getTime() + 3 * 3_600_000)}
    order by o.starts_at`;
  const level = levelFor(c.visitCount, s);
  return rows
    .map((o) => ({ ...o, state: flashState(o, now), targeted: isTargeted(o, { level, lastVisitAt: c.lastVisitAt, createdAt: c.createdAt }, now) }))
    .filter((o) => o.targeted);
}

export type ScanSummary = {
  customer: { id: string; firstName: string; level: Level; points: number; visitCount: number; preferredChoice: Choice | null };
  visit: { eligible: true } | { eligible: false; nextEligibleAt: Date };
  gifts: CustomerGift[];
  offers: LiveOffer[];
  rules: { minOrderAmount: number; instantDiscountPercent: number; pointsForGift: number };
};

/** Everything the barista needs on screen after scanning a customer. */
export async function getScanSummary(customerId: string, now = new Date()): Promise<ScanSummary> {
  const s = await loadSettings();
  const [c] = await sql<{ id: string; firstName: string; points: number; visitCount: number; lastVisitAt: Date | null; createdAt: Date; preferredChoice: Choice | null }[]>`
    select id, first_name, points, visit_count, last_visit_at, created_at, preferred_choice
    from customers where id = ${customerId} and deleted_at is null`;
  if (!c) throw new LoyaltyError("customer_not_found");
  const cooldown = evaluateVisit({ amount: Number.MAX_SAFE_INTEGER, lastCountedVisitAt: c.lastVisitAt, now }, s);
  const gifts = (await listCustomerGifts(c.id, s, now)).filter((g) => g.status === "available" || g.status === "used_today" || g.status === "locked");
  const offers = (await listOffersForCustomer(c, s, now)).filter((o) => o.state === "live" || o.state === "sold_out");
  return {
    customer: { id: c.id, firstName: c.firstName, level: levelFor(c.visitCount, s), points: c.points, visitCount: c.visitCount, preferredChoice: c.preferredChoice },
    visit: cooldown.counted ? { eligible: true } : { eligible: false, nextEligibleAt: (cooldown as { nextEligibleAt: Date }).nextEligibleAt },
    gifts,
    offers,
    rules: { minOrderAmount: s.minOrderAmount, instantDiscountPercent: s.instantDiscountPercent, pointsForGift: s.pointsForGift },
  };
}

export async function giftOwner(giftId: string): Promise<string | null> {
  const [row] = await sql<{ customerId: string }[]>`select customer_id from customer_gifts where id = ${giftId}`;
  return row?.customerId ?? null;
}
