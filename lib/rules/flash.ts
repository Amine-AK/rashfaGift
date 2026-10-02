import type { Level } from "./levels";
import { DAY } from "../time";

export type FlashOffer = {
  startsAt: Date;
  endsAt: Date;
  maxQty: number;
  claimedQty: number;
  stoppedAt: Date | null;
  target: "all" | "level" | "inactive";
  targetLevel: Level | null;
};

export type FlashState = "scheduled" | "live" | "sold_out" | "ended";

export function flashState(o: FlashOffer, now: Date): FlashState {
  if (o.stoppedAt || now >= o.endsAt) return "ended";
  if (now < o.startsAt) return "scheduled";
  if (o.claimedQty >= o.maxQty) return "sold_out";
  return "live";
}

/** "Inactive" customers for targeting: no visit for at least this many days. */
export const INACTIVE_AFTER_DAYS = 14;

export function isTargeted(
  o: Pick<FlashOffer, "target" | "targetLevel">,
  c: { level: Level; lastVisitAt: Date | null; createdAt: Date },
  now: Date,
): boolean {
  if (o.target === "all") return true;
  if (o.target === "level") return c.level === o.targetLevel;
  const last = c.lastVisitAt ?? c.createdAt;
  return now.getTime() - last.getTime() >= INACTIVE_AFTER_DAYS * DAY;
}

export type FlashClaimDecision =
  | { ok: true }
  | { ok: false; reason: "not_live" | "sold_out" | "already_claimed" | "not_targeted" };

export function canClaimFlash(
  o: FlashOffer,
  ctx: { now: Date; alreadyClaimed: boolean; targeted: boolean },
): FlashClaimDecision {
  const state = flashState(o, ctx.now);
  if (state === "sold_out") return { ok: false, reason: "sold_out" };
  if (state !== "live") return { ok: false, reason: "not_live" };
  if (ctx.alreadyClaimed) return { ok: false, reason: "already_claimed" };
  if (!ctx.targeted) return { ok: false, reason: "not_targeted" };
  return { ok: true };
}
