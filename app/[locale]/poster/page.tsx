import QRCode from "qrcode";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Mascot } from "@/components/brand/Mascot";
import { LampShade } from "@/components/brand/LampShade";
import { DrinkDoodle } from "@/components/brand/DrinkDoodle";
import { PrintButton } from "@/components/admin/PrintButton";
import { env } from "@/lib/env";

export const metadata = { robots: { index: false } };

const TILES = ["#D9483B", "#1F4E9C", "#2F7D4F", "#E8B43A", "#2BA59B", "#E58FA6"];

function TileBand() {
  return (
    <div className="flex justify-center gap-1.5" aria-hidden>
      {Array.from({ length: 22 }, (_, i) => (
        <span key={i} className="size-4 rounded-[2px] print:[print-color-adjust:exact]" style={{ background: TILES[(i * 5) % TILES.length] }} />
      ))}
    </div>
  );
}

/** Printable A4 poster for the counter and the tables: scan to join. */
export default async function PosterPage({ params }: PageProps<"/[locale]/poster">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tc] = await Promise.all([getTranslations("poster"), getTranslations("common")]);
  const url = `${env.appUrl()}/${locale}/join`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "H", color: { dark: "#3B2418", light: "#FFFFFF" } });

  return (
    <main className="min-h-dvh bg-cream py-6 print:bg-white print:p-0">
      <style>{`@page { size: A4; margin: 0 } @media print { html, body { background: #fff } }`}</style>
      <div className="mx-auto mb-4 flex max-w-[210mm] justify-end px-4 print:hidden">
        <PrintButton label={t("print")} />
      </div>
      <article className="menu-board mx-auto flex h-[297mm] w-[210mm] max-w-full flex-col items-center justify-between px-[18mm] py-[16mm] text-center print:shadow-none [print-color-adjust:exact]">
        <TileBand />
        <div className="flex flex-col items-center">
          <LampShade size={56} swing={false} />
          <h1 className="mt-2 font-serif text-[64px] font-bold leading-none">{tc("cafeName")}</h1>
          <p className="mt-3 font-hand text-[34px] text-wood-dark">{tc("slogan")}</p>
        </div>
        <div className="flex items-center gap-6">
          <DrinkDoodle kind="cup" size={84} />
          <div className="rounded-3xl bg-white p-5 shadow-[var(--shadow-soft)] [&>svg]:size-[78mm]" dangerouslySetInnerHTML={{ __html: svg }} />
          <DrinkDoodle kind="crepe" size={84} />
        </div>
        <div className="space-y-3">
          <p className="font-serif text-[30px] font-bold text-menu-green">{t("headline")}</p>
          <ol className="mx-auto max-w-[150mm] space-y-1 text-[19px]">
            <li>1 · {t("step1")}</li>
            <li>2 · {t("step2")}</li>
            <li>3 · {t("step3")}</li>
          </ol>
          <hr className="dotted-rule mx-auto w-2/3" />
          <p className="text-[15px] text-wood-dark" dir="ltr">
            {url.replace(/^https?:\/\//, "")}
          </p>
        </div>
        <div className="flex items-end gap-4">
          <Mascot size={86} />
        </div>
        <TileBand />
      </article>
    </main>
  );
}
