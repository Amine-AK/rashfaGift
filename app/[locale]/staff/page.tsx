import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { StaffScanner } from "@/components/staff/StaffScanner";
import { LogoutButton } from "@/components/staff/LogoutButton";
import { getCurrentStaff } from "@/lib/auth/staff";

export const metadata = { robots: { index: false } };

export default async function StaffPage({ params }: PageProps<"/[locale]/staff">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await getCurrentStaff();
  if (!staff) redirect({ href: "/staff/login", locale });
  const t = await getTranslations("staff");

  return (
    <div className="min-h-dvh bg-cream">
      <header className="flex items-center justify-between gap-2 border-b border-wood/20 px-4 py-3">
        <div>
          <p className="font-serif text-xl font-bold">{t("title")}</p>
          <p className="text-sm text-wood-dark">{t("signedInAs", { name: staff!.name })}</p>
        </div>
        <div className="flex items-center gap-2">
          {staff!.role === "admin" && (
            <Link href="/admin" className="rounded-full px-3 py-2 text-sm font-bold text-menu-green underline-offset-4 hover:underline">
              {t("admin")}
            </Link>
          )}
          <LanguageSwitcher />
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-4">
        <StaffScanner />
        <div className="mt-8 text-center">
          <LogoutButton label={t("logout")} />
        </div>
      </main>
    </div>
  );
}
