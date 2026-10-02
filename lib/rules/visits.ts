import { HOUR } from "../time";
import type { Settings } from "../settings-schema";

export type Choice = "discount" | "save";

export type VisitDecision =
  | { counted: true }
  | { counted: false; reason: "below_min"; minAmount: number }
  | { counted: false; reason: "cooldown"; nextEligibleAt: Date };

/** Does this order count as a visit? (minimum amount + one counted visit per cooldown window) */
export function evaluateVisit(
  input: { amount: number; lastCountedVisitAt: Date | null; now: Date },
  s: Pick<Settings, "minOrderAmount" | "visitCooldownHours">,
): VisitDecision {
  if (!(input.amount >= s.minOrderAmount)) return { counted: false, reason: "below_min", minAmount: s.minOrderAmount };
  if (input.lastCountedVisitAt) {
    const nextEligibleAt = new Date(input.lastCountedVisitAt.getTime() + s.visitCooldownHours * HOUR);
    if (input.now < nextEligibleAt) return { counted: false, reason: "cooldown", nextEligibleAt };
  }
  return { counted: true };
}

export type ChoiceOutcome = {
  points: number;
  giftsUnlocked: number;
  discountPercent: number;
};

/** Applies "treat me now" (discount today) or "save it" (+1 point; every N points unlocks a gift). */
export function applyChoice(points: number, choice: Choice, s: Pick<Settings, "pointsForGift" | "instantDiscountPercent">): ChoiceOutcome {
  if (choice === "discount") return { points, giftsUnlocked: 0, discountPercent: s.instantDiscountPercent };
  return addPoints(points, 1, s);
}

/** Adds points and converts every full set of `pointsForGift` into an unlocked gift. */
export function addPoints(points: number, delta: number, s: Pick<Settings, "pointsForGift">): ChoiceOutcome {
  const total = points + delta;
  const giftsUnlocked = Math.floor(total / s.pointsForGift);
  return { points: total - giftsUnlocked * s.pointsForGift, giftsUnlocked, discountPercent: 0 };
}
