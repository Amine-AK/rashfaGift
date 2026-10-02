import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { ZelligeCard } from "@/components/ui/Card";
import { GiftReveal } from "@/components/customer/GiftReveal";
import { RotatingQr } from "@/components/customer/RotatingQr";
import { ShareGift } from "@/components/customer/ShareGift";
import { getCurrentCustomer } from "@/lib/auth/customer";
import { getSettings } from "@/lib/settings";
import { listCustomerGifts } from "@/lib/services/loyalty";
import { tr } from "@/lib/i18n-text";

export const dynamic = "force-dynamic";

export default async function GiftPage({ params }: PageProps<"/[locale]/gifts/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const customer = await getCurrentCustomer();
  if (!customer) return redirect({ href: "/join", locale });
  const s = await getSettings();
  const gift = (await listCustomerGifts(customer.id, s)).find((g) => g.id === id);
  if (!gift) notFound();

  const [t, format] = await Promise.all([getTranslations("gifts"), getFormatter()]);
  const title = tr(gift.title, locale);
  const day = (d: Date) => format.dateTime(d, { weekday: "long", day: "numeric", month: "long" });

  return (
    <PageShell homeHref="/home">
      <Link href="/home" className="inline-flex min-h-12 items-center text-wood-dark">
        ← {t("back")}
      </Link>
      <ZelligeCard className="mt-2" innerClassName="py-8">
        <p className="mb-5 text-center text-sm font-bold uppercase tracking-wider text-wood-dark">{t(`source.${gift.source}`)}</p>
        <GiftReveal giftId={gift.id} title={title} tier={gift.tier} revealed={gift.source !== "mystery" || !!gift.revealedAt} />
      </ZelligeCard>

      <div className="mt-5 space-y-4 text-center">
        {gift.status === "available" && (
          <>
            <p className="text-lg">{t("showAtCounter")}</p>
            <RotatingQr giftId={gift.id} size={200} />
            <p className="text-sm text-wood-dark">{t("validUntil", { date: day(new Date(gift.expiresAt.getTime() - 1)) })}</p>
            {gift.usesLeft > 1 && <p className="text-sm font-bold">{t("usesLeftLong", { count: gift.usesLeft })}</p>}
          </>
        )}
        {gift.status === "used_today" && <p className="rounded-2xl bg-wood-light/50 p-4">{t("usedToday", { count: gift.usesLeft })}</p>}
        {gift.status === "locked" && <p className="rounded-2xl bg-zellige-blue/10 p-4 text-lg">{t("lockedUntil", { date: day(gift.availableFrom) })}</p>}
        {gift.status === "claimed" && <p className="rounded-2xl bg-cream p-4">{t("claimedNote")}</p>}
        {gift.status === "expired" && <p className="rounded-2xl bg-cream p-4">{t("expiredNote")}</p>}
        {(gift.source !== "mystery" || gift.revealedAt) && gift.status !== "expired" && <ShareGift giftId={gift.id} />}
      </div>
    </PageShell>
  );
}
