import { getTranslations, setRequestLocale } from "next-intl/server";
import { GiftPoolEditor, type PoolRow } from "@/components/admin/GiftPoolEditor";
import { sql } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function GiftsAdminPage({ params }: PageProps<"/[locale]/admin/gifts">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, s] = await Promise.all([getTranslations("admin.gifts"), getSettings()]);
  const pool = await sql<PoolRow[]>`select id, title, tier, weight, est_cost, uses, active from gift_pool order by tier, weight desc`;
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-3xl font-bold">{t("title")}</h1>
      <p className="max-w-2xl text-wood-dark">{t("intro", { cap: s.rareGiftMonthlyCap, points: s.pointsForGift })}</p>
      <GiftPoolEditor pool={pool} />
    </div>
  );
}
