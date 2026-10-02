import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Mascot } from "@/components/brand/Mascot";
import { buttonClass } from "@/components/ui/Button";

export default function NotFound() {
  const t = useTranslations("common");
  return (
    <main className="bg-zellige grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <Mascot size={120} />
        <h1 className="mt-4 font-serif text-3xl font-bold text-menu-green">{t("notFoundTitle")}</h1>
        <p className="mt-2">{t("notFoundBody")}</p>
        <Link href="/" className={buttonClass("primary", "md", "mt-6")}>{t("goHome")}</Link>
      </div>
    </main>
  );
}
