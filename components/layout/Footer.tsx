import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations("common");
  return (
    <footer className="woven border-t border-wood/20">
      <div className="mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-wood-dark">
        <p className="font-hand text-xl">{t("slogan")}</p>
        <nav className="flex gap-4">
          <Link href="/menu" className="underline-offset-4 hover:underline">{t("menu")}</Link>
          <Link href="/privacy" className="underline-offset-4 hover:underline">{t("privacy")}</Link>
          <Link href="/staff" className="underline-offset-4 hover:underline">{t("staffArea")}</Link>
        </nav>
      </div>
    </footer>
  );
}
