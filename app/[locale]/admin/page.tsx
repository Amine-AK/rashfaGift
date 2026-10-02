import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { ColumnChart, Heatmap, SplitBar } from "@/components/admin/charts";
import { CHART } from "@/components/admin/chart-colors";
import { getSettings } from "@/lib/settings";
import { loadStats } from "@/lib/services/stats";
import { tr } from "@/lib/i18n-text";

export const dynamic = "force-dynamic";

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-paper p-4 shadow-[var(--shadow-soft)]">
      <p className="text-sm text-wood-dark">{label}</p>
      <p className="mt-1 font-serif text-3xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-wood-dark">{hint}</p>}
    </div>
  );
}

export default async function AdminStats({ params }: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, format, s] = await Promise.all([getTranslations("admin.stats"), getFormatter(), getSettings()]);
  const stats = await loadStats(s);
  const pct = (v: number) => format.number(v, { style: "percent", maximumFractionDigits: 0 });
  const dh = (v: number) => `${format.number(v, { maximumFractionDigits: 0 })} DH`;

  const days = t("days").split(",");
  const busyHours = stats.heatmap.map((c) => c.hour);
  const from = Math.min(8, ...busyHours);
  const to = Math.max(22, ...busyHours);
  const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-serif text-3xl font-bold">{t("title")}</h1>
        <div className="flex gap-2 text-sm">
          {/* Plain links with download: these are files, not pages. */}
          <a className="rounded-full border-2 border-wood px-4 py-2 font-bold hover:bg-wood-light/40" href="/api/admin/export?type=customers" download>
            {t("exportCustomers")}
          </a>
          <a className="rounded-full border-2 border-wood px-4 py-2 font-bold hover:bg-wood-light/40" href="/api/admin/export?type=visits" download>
            {t("exportVisits")}
          </a>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label={t("customers")} value={String(stats.totals.customers)} hint={t("newThisWeek", { count: stats.totals.newWeek })} />
        <Tile label={t("visitsWeek")} value={String(stats.totals.visitsWeek)} hint={t("active30", { count: stats.totals.active30 })} />
        <Tile label={t("returningRate")} value={pct(stats.returningRate)} hint={t("returningHint")} />
        <Tile label={t("winbackRate")} value={pct(stats.winback.rate)} hint={t("winbackHint", { returned: stats.winback.returned, sent: stats.winback.sent })} />
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-serif text-xl font-bold">{t("newPerWeek")}</h2>
          <p className="mb-4 text-sm text-wood-dark">{t("newPerWeekHint")}</p>
          <ColumnChart
            data={stats.newPerWeek.map((w) => ({ label: format.dateTime(new Date(`${w.week}T12:00:00Z`), { day: "numeric", month: "short" }), value: w.count }))}
            valueLabel={t("newCustomers")}
            tableLabel={t("showTable")}
          />
        </Card>

        <Card>
          <h2 className="font-serif text-xl font-bold">{t("choiceTitle")}</h2>
          <p className="mb-4 text-sm text-wood-dark">{t("choiceHint")}</p>
          <SplitBar
            parts={[
              { label: t("save"), value: stats.choices.save, color: CHART.save },
              { label: t("discount"), value: stats.choices.discount, color: CHART.discount },
            ]}
          />
          <hr className="dotted-rule my-5" />
          <h2 className="font-serif text-xl font-bold">{t("giftsTitle")}</h2>
          <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-wood-dark">{t("giftsUnlocked")}</dt>
            <dd className="text-end font-bold tabular-nums">{stats.gifts.unlocked}</dd>
            <dt className="text-wood-dark">{t("giftsClaimed")}</dt>
            <dd className="text-end font-bold tabular-nums">{stats.gifts.claimed}</dd>
            <dt className="text-wood-dark">{t("giftsCost")}</dt>
            <dd className="text-end font-bold tabular-nums">{dh(stats.gifts.cost)}</dd>
            <dt className="text-wood-dark">{t("rareThisMonth")}</dt>
            <dd className="text-end font-bold tabular-nums">
              <bdi dir="ltr">
                {stats.gifts.rare} / {s.rareGiftMonthlyCap}
              </bdi>
            </dd>
            <dt className="text-wood-dark">{t("giftsOpen")}</dt>
            <dd className="text-end font-bold tabular-nums">{stats.gifts.open}</dd>
          </dl>
        </Card>
      </div>

      <Card>
        <h2 className="font-serif text-xl font-bold">{t("heatmapTitle")}</h2>
        <p className="mb-4 text-sm text-wood-dark">{t("heatmapHint")}</p>
        <Heatmap
          cells={stats.heatmap}
          days={days}
          hours={hours}
          valueLabel={t("visits")}
          legend={{ less: t("less"), more: t("more") }}
          tableLabel={t("showTable")}
        />
      </Card>

      <Card>
        <h2 className="font-serif text-xl font-bold">{t("flashTitle")}</h2>
        {stats.flash.length === 0 ? (
          <p className="mt-2 text-wood-dark">{t("flashEmpty")}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-start text-wood-dark">
                  <th className="py-2 text-start">{t("offer")}</th>
                  <th className="py-2 text-end">{t("notified")}</th>
                  <th className="py-2 text-end">{t("claimed")}</th>
                  <th className="py-2 text-end">{t("conversion")}</th>
                </tr>
              </thead>
              <tbody>
                {stats.flash.map((o) => (
                  <tr key={o.id} className="border-t border-wood/15">
                    <td className="py-2">
                      <span className="font-bold">{tr(o.title, locale)}</span>
                      <span className="block text-xs text-wood-dark">{format.dateTime(o.startsAt, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </td>
                    <td className="py-2 text-end tabular-nums">{o.pushStatus === "skipped" ? t("pushSkipped") : o.pushedCount}</td>
                    <td className="py-2 text-end tabular-nums">
                      <bdi dir="ltr">
                        {o.claimedQty} / {o.maxQty}
                      </bdi>
                    </td>
                    <td className="py-2 text-end tabular-nums">{o.pushedCount ? pct(o.claimedQty / o.pushedCount) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
