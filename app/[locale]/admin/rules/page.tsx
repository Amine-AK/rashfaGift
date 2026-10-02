import { getTranslations, setRequestLocale } from "next-intl/server";
import { RulesForm } from "@/components/admin/RulesForm";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function RulesPage({ params }: PageProps<"/[locale]/admin/rules">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, s] = await Promise.all([getTranslations("admin.rules"), getSettings()]);
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-3xl font-bold">{t("title")}</h1>
      <p className="max-w-2xl text-wood-dark">{t("intro")}</p>
      <RulesForm initial={s} />
    </div>
  );
}
