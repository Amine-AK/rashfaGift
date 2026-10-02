import { getTranslations, setRequestLocale } from "next-intl/server";
import { MenuEditor } from "@/components/admin/MenuEditor";
import { loadMenu } from "@/lib/services/menu";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function MenuAdminPage({ params }: PageProps<"/[locale]/admin/menu">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.menu");
  const menu = await loadMenu({ includeHidden: true });
  const toVerify = menu.flatMap((c) => c.items).filter((i) => i.needsVerify).length;
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-3xl font-bold">{t("title")}</h1>
      {toVerify > 0 && <p className="rounded-xl bg-zellige-yellow/25 px-4 py-3 font-bold">{t("toVerify", { count: toVerify })}</p>}
      <p className="max-w-2xl text-sm text-wood-dark">{t("photoPolicy")}</p>
      <MenuEditor menu={menu} canUpload={!!env.supabaseStorage()} />
    </div>
  );
}
