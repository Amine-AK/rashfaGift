import Image from "next/image";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Card, SectionTitle, ZelligeCard } from "@/components/ui/Card";
import { MosaicRing } from "@/components/brand/MosaicRing";
import { Mascot } from "@/components/brand/Mascot";
import { RotatingQr } from "@/components/customer/RotatingQr";
import { ChoicePreference } from "@/components/customer/ChoicePreference";
import { FlashOfferCard } from "@/components/customer/FlashOfferCard";
import { GiftList } from "@/components/customer/GiftList";
import { LevelBadge } from "@/components/customer/LevelBadge";
import { NotifyPrompt } from "@/components/pwa/NotifyPrompt";
import { getCurrentCustomer } from "@/lib/auth/customer";
import { getSettings } from "@/lib/settings";
import { listCustomerGifts, listOffersForCustomer } from "@/lib/services/loyalty";
import { levelFor, nextLevel } from "@/lib/rules/levels";
import { localHour } from "@/lib/time";
import { tr } from "@/lib/i18n-text";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("home");
  return { title: t("title") };
}

export default async function HomePage({ params }: PageProps<"/[locale]/home">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const customer = await getCurrentCustomer();
  if (!customer) return redirect({ href: "/join", locale });

  // Remember the customer's language for notifications.
  if (customer.locale !== locale) await sql`update customers set locale = ${locale} where id = ${customer.id}`;

  const [t, format, s] = await Promise.all([getTranslations("home"), getFormatter(), getSettings()]);
  const now = new Date();
  const [gifts, offers] = await Promise.all([listCustomerGifts(customer.id, s, now), listOffersForCustomer(customer, s, now)]);
  const level = levelFor(customer.visitCount, s);
  const next = nextLevel(customer.visitCount, s);
  const hour = localHour(now, s.timezone);
  const greeting = hour < 12 && hour >= 5 ? "morning" : hour < 18 && hour >= 5 ? "afternoon" : "evening";
  const savesToGo = s.pointsForGift - customer.points;
  const liveOffers = offers.filter((o) => o.state === "live" || o.state === "scheduled");

  return (
    <PageShell homeHref="/home">
      {/* 1. Greeting + level */}
      <section className="flex items-center justify-between gap-3">
        <div>
          <p className="font-hand text-2xl text-wood-dark">{t(`greeting.${greeting}`)}</p>
          <h1 className="font-serif text-3xl font-bold leading-tight text-espresso">{customer.firstName}</h1>
        </div>
        <LevelBadge level={level} />
      </section>

      <div className="mt-5 space-y-5">
        {/* 2. Flash offer */}
        {liveOffers.map((o) => (
          <FlashOfferCard
            key={o.id}
            offer={{
              id: o.id,
              title: tr(o.title, locale),
              reward: tr(o.reward, locale),
              startsAt: o.startsAt,
              endsAt: o.endsAt,
              claimedQty: o.claimedQty,
              maxQty: o.maxQty,
              stoppedAt: o.stoppedAt,
              claimedByMe: o.claimedByMe,
            }}
          />
        ))}

        {/* 3. Personal QR */}
        <ZelligeCard innerClassName="text-center">
          <h2 className="font-serif text-xl font-bold text-menu-green">{t("qrTitle")}</h2>
          <p className="mb-3 text-sm text-wood-dark">{t("qrHint")}</p>
          <RotatingQr />
        </ZelligeCard>

        {/* 4. Progress to the next mystery gift */}
        <Card>
          <SectionTitle hint={t("progressHint", { points: s.pointsForGift, value: s.maxGiftValue })}>{t("progressTitle")}</SectionTitle>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <MosaicRing value={customer.points} max={s.pointsForGift} label={t("progressLabel", { points: customer.points, total: s.pointsForGift })}>
              <p className="font-serif text-4xl font-bold text-espresso">
                {customer.points}
                <span className="text-xl text-wood-dark">/{s.pointsForGift}</span>
              </p>
              <p className="text-xs font-bold uppercase tracking-wide text-wood-dark">{t("saves")}</p>
            </MosaicRing>
            <div className="flex-1 space-y-3">
              <p className="text-center sm:text-start">{t("savesToGo", { count: savesToGo })}</p>
              <ChoicePreference initial={customer.preferredChoice} percent={s.instantDiscountPercent} />
            </div>
          </div>
          <hr className="dotted-rule my-4" />
          <p className="text-sm">
            <strong>{t("levelPerk")}</strong> {tr(s.levelPerks[level], locale)}
          </p>
          {next && (
            <p className="mt-1 text-sm text-wood-dark">
              {t("nextLevel", { count: next.visitsToGo, level: t(`levelNames.${next.level}`) })}
            </p>
          )}
        </Card>

        {/* 5. My gifts */}
        <Card>
          <SectionTitle>{t("giftsTitle")}</SectionTitle>
          {gifts.length ? (
            <GiftList gifts={gifts} />
          ) : (
            <div className="flex items-center gap-4">
              <Mascot size={64} />
              <p className="text-wood-dark">{t("noGifts")}</p>
            </div>
          )}
        </Card>

        <NotifyPrompt compact />

        {/* 6. Menu shortcut + 7. Invite */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/menu" className="group relative block aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-soft)]">
            <Image src="/photos/crepe-nutella-banana.jpg" alt="" fill sizes="50vw" className="object-cover transition group-hover:scale-105" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-espresso/85 to-transparent p-4 pt-10 font-serif text-xl font-bold text-white">
              {t("menu")}
            </span>
          </Link>
          <Link href="/invite" className="woven flex aspect-[4/5] flex-col justify-end rounded-[var(--radius-card)] bg-paper p-4 shadow-[var(--shadow-soft)]">
            <Mascot size={56} mood="happy" steam={false} />
            <span className="mt-2 font-serif text-xl font-bold text-menu-green">{t("invite")}</span>
            <span className="text-sm text-wood-dark">{t("inviteHint")}</span>
          </Link>
        </div>

        <p className="text-center text-sm text-wood-dark">
          {t("memberSince", { date: format.dateTime(customer.createdAt, { month: "long", year: "numeric" }) })} ·{" "}
          <Link href="/settings" className="underline underline-offset-4">
            {t("settings")}
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
