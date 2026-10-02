import { z } from "zod";
import { i18nText } from "./i18n-text";

const t = (fr: string, ar: string, en: string) => ({ fr, ar, en });

/**
 * Every business rule lives here, with its default. The owner edits them in
 * Admin → Rules; nothing below is hard-coded anywhere else.
 */
export const settingsSchema = z.object({
  minOrderAmount: z.number().min(0).max(10_000).default(15),
  visitCooldownHours: z.number().min(0).max(168).default(4),
  instantDiscountPercent: z.number().int().min(0).max(100).default(20),
  pointsForGift: z.number().int().min(1).max(50).default(3),
  maxGiftValue: z.number().min(0).max(10_000).default(50),
  giftValidityDays: z.number().int().min(1).max(365).default(14),
  rareGiftMonthlyCap: z.number().int().min(0).max(1000).default(4),

  maxPushPerWeek: z.number().int().min(0).max(21).default(2),
  pushQuietStartHour: z.number().int().min(0).max(23).default(21),
  pushQuietEndHour: z.number().int().min(0).max(23).default(9),

  welcomeGiftEnabled: z.boolean().default(true),
  welcomeGiftValidityDays: z.number().int().min(1).max(90).default(7),
  welcomeGift: i18nText.default(t("Un shot de sirop offert dans votre boisson", "جرعة شراب مجانية في مشروبك", "A free syrup shot in your drink")),

  winbackEnabled: z.boolean().default(true),
  winbackDays: z.number().int().min(1).max(365).default(21),
  winbackGiftValidityDays: z.number().int().min(1).max(90).default(7),
  winbackGift: i18nText.default(t("Un cookie offert avec votre boisson", "كوكيز مجاني مع مشروبك", "A free cookie with your drink")),

  birthdayEnabled: z.boolean().default(true),
  birthdayGiftValidityDays: z.number().int().min(1).max(90).default(7),
  birthdayGift: i18nText.default(t("Une boisson offerte pour votre anniversaire", "مشروب مجاني بمناسبة عيد ميلادك", "A free drink for your birthday")),

  maxReferralsPerMonth: z.number().int().min(0).max(100).default(5),

  levelRegularMinVisits: z.number().int().min(1).max(1000).default(5),
  levelFamilyMinVisits: z.number().int().min(2).max(5000).default(15),
  levelPerks: z
    .object({ newcomer: i18nText, regular: i18nText, family: i18nText })
    .default({
      newcomer: t("Un accueil chaleureux, et votre première surprise.", "استقبال دافئ، ومفاجأتك الأولى.", "A warm welcome, and your first surprise."),
      regular: t("Un format plus grand offert, une fois par semaine.", "حجم أكبر مجاناً، مرة في الأسبوع.", "A free size upgrade, once a week."),
      family: t("Un format plus grand offert chaque jour, et un thé à la menthe offert chaque mois.", "حجم أكبر مجاناً كل يوم، وشاي بالنعناع مجاني كل شهر.", "A free size upgrade every day, and a mint tea on us each month."),
    }),

  timezone: z
    .string()
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    })
    .default("Africa/Casablanca"),
});

export type Settings = z.infer<typeof settingsSchema>;
export const defaultSettings: Settings = settingsSchema.parse({});

/** Merge stored (possibly partial or outdated) settings over the defaults. */
export function resolveSettings(stored: unknown): Settings {
  const merged = { ...defaultSettings, ...(stored && typeof stored === "object" ? stored : {}) };
  const parsed = settingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : defaultSettings;
}
