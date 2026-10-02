import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LampShade } from "@/components/brand/LampShade";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header({ href = "/" }: { href?: string }) {
  const t = useTranslations("common");
  return (
    <header className="sticky top-0 z-30 border-b border-wood/20 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-xl items-center justify-between gap-3 px-4">
        <Link href={href} className="flex items-center gap-2 rounded-lg">
          <LampShade size={26} className="-mt-3" />
          <span className="font-serif text-2xl font-bold tracking-tight text-espresso">{t("cafeName")}</span>
        </Link>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
