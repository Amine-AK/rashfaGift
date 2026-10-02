"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const TABS = [
  ["/admin", "stats"],
  ["/admin/offers", "offers"],
  ["/admin/menu", "menu"],
  ["/admin/gifts", "gifts"],
  ["/admin/rules", "rules"],
  ["/admin/team", "team"],
] as const;

export function AdminNav() {
  const t = useTranslations("admin.nav");
  const path = usePathname();
  return (
    <nav className="mx-auto max-w-5xl overflow-x-auto px-4">
      <ul className="flex gap-1 whitespace-nowrap">
        {TABS.map(([href, key]) => {
          const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center border-b-[3px] px-3 text-sm font-bold ${
                  active ? "border-menu-green text-menu-green" : "border-transparent text-wood-dark hover:text-espresso"
                }`}
              >
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
