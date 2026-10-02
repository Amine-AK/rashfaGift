import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Mascot } from "@/components/brand/Mascot";
import { DrinkDoodle } from "@/components/brand/DrinkDoodle";
import { buttonClass } from "@/components/ui/Button";
import { getCustomerSession } from "@/lib/auth/customer";

const crepes = [
  { src: "/photos/crepe-nutella-banana.jpg", alt: "Nutella banana crêpe" },
  { src: "/photos/crepe-oreo.jpg", alt: "Oreo crêpe" },
  { src: "/photos/crepe-lotus.jpg", alt: "Lotus crêpe" },
];

export default async function Landing({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");
  const tc = await getTranslations("common");
  const session = await getCustomerSession();

  return (
    <>
      <Header />
      <main>
        <section className="bg-zellige border-b border-wood/20">
          <div className="mx-auto flex max-w-xl flex-col items-center px-6 pb-10 pt-8 text-center">
            <Mascot size={128} title={tc("cafeName")} />
            <h1 className="mt-4 font-serif text-4xl font-bold text-menu-green">{t("title")}</h1>
            <p className="mt-2 font-hand text-3xl text-wood-dark">{tc("slogan")}</p>
            <p className="mt-4 max-w-md text-lg leading-relaxed">{t("intro")}</p>
            <div className="mt-7 flex w-full max-w-sm flex-col gap-3">
              <Link href={session ? "/home" : "/join"} className={buttonClass("primary", "lg")}>
                {session ? t("myCard") : t("join")}
              </Link>
              <Link href="/menu" className={buttonClass("secondary", "lg")}>
                {t("seeMenu")}
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-xl px-4 py-10">
          <h2 className="text-center font-serif text-2xl font-bold text-menu-green">{t("howTitle")}</h2>
          <hr className="woven-band mx-auto mt-3 w-24 border-0" />
          <ol className="mt-6 space-y-4">
            {(["step1", "step2", "step3"] as const).map((step, i) => (
              <li key={step} className="flex items-center gap-4 rounded-2xl bg-paper p-4 shadow-[var(--shadow-soft)]">
                <DrinkDoodle kind={(["cup", "crepe", "frappe"] as const)[i]} size={56} />
                <p className="text-base leading-snug">{t(step)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-xl px-4 pb-12">
          <h2 className="font-serif text-2xl font-bold text-menu-green">{t("signature")}</h2>
          <p className="font-hand text-2xl text-wood-dark">{t("signatureText")}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {crepes.map((c) => (
              <div key={c.src} className="relative aspect-[3/4] overflow-hidden rounded-2xl shadow-[var(--shadow-soft)]">
                <Image src={c.src} alt={c.alt} fill sizes="(max-width: 640px) 33vw, 200px" className="object-cover" />
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
