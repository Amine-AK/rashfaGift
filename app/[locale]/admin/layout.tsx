import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { LampShade } from "@/components/brand/LampShade";
import { AdminNav } from "@/components/admin/AdminNav";
import { getCurrentStaff } from "@/lib/auth/staff";

export const metadata = { robots: { index: false } };

export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await getCurrentStaff();
  if (!staff) return redirect({ href: "/staff/login", locale });
  if (staff.role !== "admin") return redirect({ href: "/staff", locale });
  const t = await getTranslations("admin");

  return (
    <div className="min-h-dvh bg-cream">
      <header className="border-b border-wood/20 bg-paper">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2">
            <LampShade size={24} swing={false} />
            <span className="font-serif text-xl font-bold">{t("title")}</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/staff" className="text-sm font-bold text-menu-green underline-offset-4 hover:underline">
              {t("counter")}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
        <AdminNav />
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">{children}</main>
    </div>
  );
}
