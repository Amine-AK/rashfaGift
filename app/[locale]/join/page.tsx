import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Mascot } from "@/components/brand/Mascot";
import { getCustomerSession } from "@/lib/auth/customer";
import { JoinFlow } from "./JoinFlow";

export async function generateMetadata() {
  const t = await getTranslations("join");
  return { title: t("title") };
}

export default async function JoinPage({ params, searchParams }: PageProps<"/[locale]/join">) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (await getCustomerSession()) redirect({ href: "/home", locale });
  const ref = (await searchParams).ref;
  const t = await getTranslations("join");

  return (
    <PageShell>
      <div className="flex flex-col items-center text-center">
        <Mascot size={88} />
        <h1 className="mt-3 font-serif text-3xl font-bold text-menu-green">{t("title")}</h1>
        <p className="mt-1 text-wood-dark">{t("subtitle")}</p>
      </div>
      <JoinFlow referralCode={typeof ref === "string" ? ref.slice(0, 12) : null} />
    </PageShell>
  );
}
