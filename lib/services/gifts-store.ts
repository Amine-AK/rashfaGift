import "server-only";
import type { Tx } from "../db";
import type { I18nText } from "../i18n-text";
import type { GiftWindow, Tier } from "../rules/gifts";

export type NewGift = {
  customerId: string;
  source: "mystery" | "welcome" | "winback" | "birthday";
  title: I18nText;
  window: GiftWindow;
  giftPoolId?: string | null;
  tier?: Tier | null;
  estCost?: number;
  uses?: number;
};

export async function insertGift(tx: Tx, g: NewGift): Promise<string> {
  const [row] = await tx<{ id: string }[]>`
    insert into customer_gifts (customer_id, source, gift_pool_id, title, tier, est_cost, available_from, expires_at, uses_left)
    values (${g.customerId}, ${g.source}, ${g.giftPoolId ?? null}, ${tx.json(g.title)}, ${g.tier ?? null},
            ${g.estCost ?? 0}, ${g.window.availableFrom}, ${g.window.expiresAt}, ${g.uses ?? 1})
    returning id`;
  return row.id;
}
