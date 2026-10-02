"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { locales } from "@/i18n/routing";

const labels: Record<string, string> = { fr: "FR", ar: "ع", en: "EN" };

export function LanguageSwitcher() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const current = useLocale();
  return (
    <nav aria-label={t("language")} className="flex rounded-full bg-paper/80 p-1 shadow-sm">
      {locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          aria-current={locale === current ? "true" : undefined}
          className={`grid min-h-9 min-w-9 place-items-center rounded-full px-2 text-sm font-bold transition ${
            locale === current ? "bg-menu-green text-white" : "text-wood-dark hover:bg-wood-light/50"
          }`}
          lang={locale}
        >
          {labels[locale]}
        </Link>
      ))}
    </nav>
  );
}
