import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { ZelligeCard } from "@/components/ui/Card";
import { Mascot } from "@/components/brand/Mascot";
import { InviteShare } from "@/components/customer/InviteShare";
import { getCurrentCustomer } from "@/lib/auth/customer";
import { getSettings } from "@/lib/settings";
import { sql } from "@/lib/db";
import { env } from "@/lib/env";
import { startOfLocalMonth } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: PageProps<"/[locale]/invite">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const customer = await getCurrentCustomer();
  if (!customer) return redirect({ href: "/join", locale });
  const [t, s] = await Promise.all([getTranslations("invite"), getSettings()]);
  const [{ rewarded, pending }] = await sql<{ rewarded: number; pending: number }[]>`
    select count(*) filter (where rewarded_at >= ${startOfLocalMonth(new Date(), s.timezone)})::int as rewarded,
           count(*) filter (where rewarded_at is null)::int as pending
    from referrals where referrer_id = ${customer.id}`;
  const link = `${env.appUrl()}/${locale}/join?ref=${customer.referralCode}`;

  return (
    <PageShell homeHref="/home">
      <Link href="/home" className="inline-flex min-h-12 items-center text-wood-dark">
        ← {t("back")}
      </Link>
      <div className="flex flex-col items-center text-center">
        <Mascot size={88} mood="happy" />
        <h1 className="mt-3 font-serif text-3xl font-bold text-menu-green">{t("title")}</h1>
        <p className="mt-2 max-w-sm text-lg">{t("intro")}</p>
      </div>
      <ZelligeCard className="mt-6" innerClassName="space-y-4 text-center">
        <p className="text-sm text-wood-dark">{t("yourCode")}</p>
        <p className="font-mono text-4xl font-bold tracking-[0.3em]" dir="ltr">
          {customer.referralCode}
        </p>
        <InviteShare link={link} message={t("message", { link })} />
      </ZelligeCard>
      <p className="mt-5 text-center text-sm text-wood-dark">
        {t("stats", { rewarded, max: s.maxReferralsPerMonth })}
        {pending > 0 && <> · {t("pending", { count: pending })}</>}
      </p>
    </PageShell>
  );
}
