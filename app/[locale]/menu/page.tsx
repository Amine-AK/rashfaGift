import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DrinkDoodle, type DoodleKind } from "@/components/brand/DrinkDoodle";
import { loadMenu, type MenuItem } from "@/lib/services/menu";
import { tr } from "@/lib/i18n-text";

// The menu changes rarely: re-render at most once a minute.
export const revalidate = 60;

export async function generateMetadata() {
  const t = await getTranslations("menu");
  return { title: t("title") };
}

function Price({ item, t }: { item: MenuItem; t: (k: string) => string }) {
  if (item.soldOut) return <span className="shrink-0 whitespace-nowrap text-sm font-bold text-zellige-red">{t("soldOut")}</span>;
  if (item.price == null || item.needsVerify) return <span className="shrink-0 whitespace-nowrap text-sm text-wood-dark">{t("priceAtCounter")}</span>;
  return (
    <span className="shrink-0 whitespace-nowrap font-bold tabular-nums" dir="ltr">
      {Number.isInteger(item.price) ? item.price : item.price.toFixed(2)} DH
    </span>
  );
}

export default async function MenuPage({ params }: PageProps<"/[locale]/menu">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tc] = await Promise.all([getTranslations("menu"), getTranslations("common")]);
  const menu = await loadMenu().catch(() => []);
  const signature = menu.filter((c) => c.highlight);
  const rest = menu.filter((c) => !c.highlight);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-xl px-4 pb-16 pt-6">
        <h1 className="text-center font-serif text-4xl font-bold">{t("title")}</h1>
        <p className="text-center font-hand text-2xl text-wood-dark">{tc("slogan")}</p>

        {menu.length > 0 && (
          <nav aria-label={t("categories")} className="sticky top-16 z-20 -mx-4 mt-4 overflow-x-auto bg-cream/95 px-4 py-2 backdrop-blur">
            <ul className="flex gap-2 whitespace-nowrap">
              {menu.map((c) => (
                <li key={c.id}>
                  <a href={`#${c.slug}`} className="inline-flex min-h-10 items-center rounded-full border border-wood/50 bg-paper px-4 text-sm font-bold hover:bg-wood-light/40">
                    {tr(c.name, locale)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {signature.map((c) => (
          <section key={c.id} id={c.slug} className="mt-6 scroll-mt-32">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-zellige-red">{t("signature")}</p>
                <h2 className="font-serif text-3xl font-bold">{tr(c.name, locale)}</h2>
                {c.tagline && <p className="font-hand text-xl text-wood-dark">{tr(c.tagline, locale)}</p>}
              </div>
              <DrinkDoodle kind={c.doodle as DoodleKind} size={60} />
            </div>
            <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
              {c.items.map((item) => (
                <article key={item.id} className="w-64 shrink-0 snap-start overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-[var(--shadow-soft)]">
                  <div className="relative aspect-[4/5] bg-wood-light/40">
                    {item.photoUrl ? (
                      <Image src={item.photoUrl} alt={tr(item.name, locale)} fill sizes="256px" className={`object-cover ${item.soldOut ? "grayscale" : ""}`} />
                    ) : (
                      <div className="grid size-full place-items-center">
                        <DrinkDoodle kind="crepe" size={96} />
                      </div>
                    )}
                    {item.popular && (
                      <span className="absolute start-3 top-3 rounded-full bg-zellige-yellow px-3 py-1 text-xs font-bold text-espresso">{t("popular")}</span>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-serif text-lg font-bold">{tr(item.name, locale)}</h3>
                      <Price item={item} t={t} />
                    </div>
                    {item.description && <p className="mt-1 text-sm text-wood-dark">{tr(item.description, locale)}</p>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

        <div className="mt-8 space-y-6">
          {rest.map((c) => (
            <section key={c.id} id={c.slug} className="menu-board scroll-mt-32 p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-2xl font-bold">{tr(c.name, locale)}</h2>
                  {c.tagline && <p className="text-sm italic text-wood-dark">{tr(c.tagline, locale)}</p>}
                </div>
                <DrinkDoodle kind={c.doodle as DoodleKind} size={64} className="-mt-2 shrink-0" />
              </div>
              <hr className="dotted-rule my-3" />
              <ul className="space-y-2.5">
                {c.items.map((item) => (
                  <li key={item.id} className={item.soldOut ? "opacity-60" : ""}>
                    <div className="flex items-baseline gap-2">
                      <span className={`font-semibold ${item.soldOut ? "line-through" : ""}`}>{tr(item.name, locale)}</span>
                      {item.popular && <span className="shrink-0 whitespace-nowrap rounded-full bg-zellige-yellow/40 px-2 text-[11px] font-bold">{t("popular")}</span>}
                      <span className="mx-1 flex-1 translate-y-[-3px] border-b-2 border-dotted border-espresso/20" aria-hidden />
                      <Price item={item} t={t} />
                    </div>
                    {item.description && <p className="text-sm text-wood-dark">{tr(item.description, locale)}</p>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        {menu.length === 0 && <p className="mt-10 text-center text-wood-dark">{t("empty")}</p>}
        <p className="mt-8 text-center text-xs text-wood-dark">{t("photosNote")}</p>
      </main>
      <Footer />
    </>
  );
}
