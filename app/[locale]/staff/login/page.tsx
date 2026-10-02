import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageShell } from "@/components/layout/PageShell";
import { LampShade } from "@/components/brand/LampShade";
import { PinPad } from "@/components/staff/PinPad";

export const metadata = { robots: { index: false } };

export default async function StaffLoginPage({ params }: PageProps<"/[locale]/staff/login">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("staff");
  return (
    <PageShell>
      <div className="flex flex-col items-center text-center">
        <LampShade size={56} />
        <h1 className="mt-2 font-serif text-3xl font-bold text-menu-green">{t("loginTitle")}</h1>
        <p className="mt-1 text-wood-dark">{t("loginHint")}</p>
      </div>
      <PinPad />
    </PageShell>
  );
}
