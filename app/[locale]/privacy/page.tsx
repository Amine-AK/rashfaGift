import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageShell } from "@/components/layout/PageShell";

const sections = ["collect", "why", "share", "rights", "contact"] as const;

export async function generateMetadata() {
  const t = await getTranslations("privacy");
  return { title: t("title") };
}

export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacy");
  return (
    <PageShell>
      <article className="menu-board p-6">
        <h1 className="font-serif text-3xl font-bold text-espresso">{t("title")}</h1>
        <p className="mt-3 text-lg">{t("intro")}</p>
        {sections.map((s) => (
          <section key={s} className="mt-5">
            <hr className="dotted-rule mb-4" />
            <h2 className="font-serif text-xl font-bold text-menu-green">{t(`${s}Title`)}</h2>
            <p className="mt-1 leading-relaxed">{t(s)}</p>
          </section>
        ))}
        <p className="mt-6 text-sm text-wood-dark">{t("updated")}</p>
      </article>
    </PageShell>
  );
}
