import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Caveat, Fraunces, Nunito, Tajawal } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, isRtl } from "@/i18n/routing";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import "../globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });
const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700", "800"], variable: "--font-tajawal", display: "swap" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  return {
    title: { default: `${t("cafeName")} · ${t("slogan")}`, template: `%s · ${t("cafeName")}` },
    description: t("metaDescription"),
    applicationName: t("cafeName"),
    appleWebApp: { capable: true, title: t("cafeName"), statusBarStyle: "default" },
    icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  };
}

export const viewport: Viewport = {
  themeColor: "#FBF6EE",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? "rtl" : "ltr"}
      className={`${fraunces.variable} ${nunito.variable} ${caveat.variable} ${tajawal.variable} antialiased`}
    >
      <body className="bg-cream text-espresso">
        <NextIntlClientProvider>
          {children}
          <ServiceWorkerRegister />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
