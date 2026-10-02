import type { Settings } from "../settings-schema";

export const LEVELS = ["newcomer", "regular", "family"] as const;
export type Level = (typeof LEVELS)[number];

type Thresholds = Pick<Settings, "levelRegularMinVisits" | "levelFamilyMinVisits">;

export function levelFor(visitCount: number, s: Thresholds): Level {
  if (visitCount >= s.levelFamilyMinVisits) return "family";
  if (visitCount >= s.levelRegularMinVisits) return "regular";
  return "newcomer";
}

/** Visits still needed to reach the next level, or null at the top. */
export function nextLevel(visitCount: number, s: Thresholds): { level: Level; visitsToGo: number } | null {
  const current = levelFor(visitCount, s);
  if (current === "newcomer") return { level: "regular", visitsToGo: s.levelRegularMinVisits - visitCount };
  if (current === "regular") return { level: "family", visitsToGo: s.levelFamilyMinVisits - visitCount };
  return null;
}
