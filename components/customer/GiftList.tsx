import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { tr } from "@/lib/i18n-text";
import type { CustomerGift } from "@/lib/services/loyalty";

const chip: Record<CustomerGift["status"], string> = {
  available: "bg-plant/20 text-menu-green-dark",
  used_today: "bg-wood-light text-espresso",
  locked: "bg-zellige-blue/10 text-zellige-blue",
  claimed: "bg-cream text-wood-dark",
  expired: "bg-cream text-wood-dark",
};

export async function GiftList({ gifts }: { gifts: CustomerGift[] }) {
  const [t, format, locale] = await Promise.all([getTranslations("gifts"), getFormatter(), getLocale()]);
  const order = { available: 0, used_today: 1, locked: 2, claimed: 3, expired: 4 };
  const sorted = [...gifts].sort((a, b) => order[a.status] - order[b.status]);
  const date = (d: Date) => format.dateTime(d, { weekday: "short", day: "numeric", month: "short" });

  return (
    <ul className="space-y-2">
      {sorted.map((g) => {
        const hidden = g.source === "mystery" && !g.revealedAt;
        return (
          <li key={g.id}>
            <Link
              href={`/gifts/${g.id}`}
              className={`flex min-h-16 items-center gap-3 rounded-2xl border-2 p-3 transition hover:bg-cream ${
                g.status === "available" ? "border-zellige-yellow bg-zellige-yellow/10" : "border-transparent bg-cream/60"
              } ${g.status === "claimed" || g.status === "expired" ? "opacity-60" : ""}`}
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-paper text-2xl shadow-sm" aria-hidden>
                {hidden ? "?" : "✦"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{hidden ? t("mysteryHidden") : tr(g.title, locale)}</span>
                <span className="block text-xs text-wood-dark">
                  {t(`source.${g.source}`)} ·{" "}
                  {g.status === "locked"
                    ? t("opensOn", { date: date(g.availableFrom) })
                    : g.status === "claimed"
                      ? t("enjoyed")
                      : g.status === "expired"
                        ? t("expiredOn", { date: date(new Date(g.expiresAt.getTime() - 1)) })
                        : t("validUntil", { date: date(new Date(g.expiresAt.getTime() - 1)) })}
                </span>
              </span>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${chip[g.status]}`}>{t(`status.${g.status}`)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
