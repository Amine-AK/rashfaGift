import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Mascot } from "@/components/brand/Mascot";
import { Card } from "@/components/ui/Card";
import { buttonClass } from "@/components/ui/Button";
import { InstallGuide } from "@/components/pwa/InstallGuide";
import { NotifyPrompt } from "@/components/pwa/NotifyPrompt";
import { getCurrentCustomer } from "@/lib/auth/customer";

export default async function WelcomePage({ params }: PageProps<"/[locale]/welcome">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const customer = await getCurrentCustomer();
  if (!customer) redirect({ href: "/join", locale });
  const t = await getTranslations("welcome");

  return (
    <PageShell homeHref="/home">
      <div className="flex flex-col items-center text-center">
        <Mascot size={96} mood="happy" />
        <h1 className="mt-3 font-serif text-3xl font-bold text-menu-green">{t("title", { name: customer!.firstName })}</h1>
        <p className="mt-2 text-lg">{t("giftWaiting")}</p>
      </div>

      <Card className="mt-6">
        <h2 className="font-serif text-xl font-bold text-menu-green">{t("installTitle")}</h2>
        <div className="mt-3">
          <InstallGuide />
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="font-serif text-xl font-bold text-menu-green">{t("notifyTitle")}</h2>
        <div className="mt-3">
          <NotifyPrompt />
        </div>
      </Card>

      <Link href="/home" className={buttonClass("primary", "lg", "mt-6 w-full")}>
        {t("openCard")}
      </Link>
    </PageShell>
  );
}
