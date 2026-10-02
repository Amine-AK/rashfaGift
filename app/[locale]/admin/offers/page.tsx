import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { OfferForm } from "@/components/admin/OfferForm";
import { StopOfferButton } from "@/components/admin/StopOfferButton";
import { sql } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { loadMenu } from "@/lib/services/menu";
import { flashState } from "@/lib/rules/flash";
import { tr } from "@/lib/i18n-text";
import type { FlashOfferRow } from "@/lib/services/loyalty";

export const dynamic = "force-dynamic";

export default async function OffersPage({ params }: PageProps<"/[locale]/admin/offers">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, format, s, menu] = await Promise.all([getTranslations("admin.offers"), getFormatter(), getSettings(), loadMenu({ includeHidden: true })]);
  const offers = await sql<FlashOfferRow[]>`select * from flash_offers order by starts_at desc limit 30`;
  const now = new Date();
  const items = menu.flatMap((c) => c.items.map((i) => ({ id: i.id, label: `${tr(c.name, locale)} · ${tr(i.name, locale)}` })));
  const when = (d: Date) => format.dateTime(d, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl font-bold">{t("title")}</h1>
      <Card>
        <h2 className="font-serif text-xl font-bold">{t("new")}</h2>
        <p className="mb-4 text-sm text-wood-dark">{t("newHint", { max: s.maxPushPerWeek, from: s.pushQuietEndHour, to: s.pushQuietStartHour })}</p>
        <OfferForm items={items} timezone={s.timezone} />
      </Card>
      <Card>
        <h2 className="mb-3 font-serif text-xl font-bold">{t("list")}</h2>
        {offers.length === 0 && <p className="text-wood-dark">{t("empty")}</p>}
        <ul className="space-y-2">
          {offers.map((o) => {
            const state = flashState(o, now);
            return (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-cream p-4">
                <div>
                  <p className="font-bold">
                    {tr(o.title, locale)} <span className="font-normal text-wood-dark">· {tr(o.reward, locale)}</span>
                  </p>
                  <p className="text-sm text-wood-dark">
                    {when(o.startsAt)} → {format.dateTime(o.endsAt, { hour: "2-digit", minute: "2-digit" })} · {t(`target.${o.target}`)}
                    {o.targetLevel ? ` (${o.targetLevel})` : ""} · {t("claimedOf", { claimed: o.claimedQty, max: o.maxQty })} · {t(`push.${o.pushStatus}`, { count: o.pushedCount })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${state === "live" ? "bg-zellige-red text-white" : "bg-paper text-wood-dark"}`}>{t(`state.${state}`)}</span>
                  {(state === "live" || state === "scheduled") && <StopOfferButton id={o.id} />}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
