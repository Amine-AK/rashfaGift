import { z } from "zod";

/** A short text stored in the three app languages, e.g. a gift name or a menu tagline. */
export const i18nText = z.object({
  fr: z.string().trim().max(240),
  ar: z.string().trim().max(240),
  en: z.string().trim().max(240),
});
export type I18nText = z.infer<typeof i18nText>;

/** Pick the text for `locale`, falling back to French, then to any non-empty language. */
export function tr(text: Partial<I18nText> | null | undefined, locale: string): string {
  if (!text) return "";
  const own = text[locale as keyof I18nText];
  return own || text.fr || text.en || text.ar || "";
}
