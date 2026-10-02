import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Card, SectionTitle } from "@/components/ui/Card";
import { NotifyPrompt } from "@/components/pwa/NotifyPrompt";
import { InstallGuide } from "@/components/pwa/InstallGuide";
import { AccountActions } from "@/components/customer/AccountActions";
import { getCurrentCustomer } from "@/lib/auth/customer";
import { maskPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ params }: PageProps<"/[locale]/settings">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const customer = await getCurrentCustomer();
  if (!customer) return redirect({ href: "/join", locale });
  const t = await getTranslations("settings");

  return (
    <PageShell homeHref="/home">
      <Link href="/home" className="inline-flex min-h-12 items-center text-wood-dark">
        ← {t("back")}
      </Link>
      <h1 className="font-serif text-3xl font-bold text-menu-green">{t("title")}</h1>
      <div className="mt-5 space-y-4">
        <Card>
          <SectionTitle>{t("account")}</SectionTitle>
          <p>
            {customer.firstName} · <bdi dir="ltr">{maskPhone(customer.phone)}</bdi>
          </p>
        </Card>
        <Card>
          <SectionTitle>{t("notifications")}</SectionTitle>
          <NotifyPrompt />
        </Card>
        <Card>
          <SectionTitle>{t("install")}</SectionTitle>
          <InstallGuide />
        </Card>
        <Card>
          <SectionTitle hint={t("privacyHint")}>{t("privacy")}</SectionTitle>
          <Link href="/privacy" className="font-bold text-menu-green underline underline-offset-4">
            {t("readPrivacy")}
          </Link>
          <AccountActions />
        </Card>
      </div>
    </PageShell>
  );
}
