import { defineRouting } from "next-intl/routing";

export const locales = ["fr", "ar", "en"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "fr",
  localePrefix: "always",
});

export const rtlLocales: readonly Locale[] = ["ar"];
export const isRtl = (locale: string) => rtlLocales.includes(locale as Locale);
