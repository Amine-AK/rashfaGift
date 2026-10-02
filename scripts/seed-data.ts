/**
 * Rashfa's real menu (from the menu boards) and a starter mystery-gift pool.
 * Items with `verify: true` have a price the owner must confirm before launch:
 * they show "price at the counter" on the public menu until then.
 */

type T = { fr: string; ar: string; en: string };
const t = (fr: string, ar: string, en: string): T => ({ fr, ar, en });

export type SeedItem = { name: T; price: number | null; verify?: boolean; popular?: boolean; description?: T; photo?: string };
export type SeedCategory = { slug: string; name: T; tagline: T | null; doodle: string; highlight?: boolean; items: SeedItem[] };

const same = (name: string, ar: string) => t(name, ar, name);

export const menu: SeedCategory[] = [
  {
    slug: "crepes",
    name: t("Crêpes", "كريب", "Crêpes"),
    tagline: t("Chaudes, pliées, et un brin gourmandes.", "دافئة، مطوية، وشهية قليلاً.", "Warm, folded, and a little indulgent."),
    doodle: "crepe",
    highlight: true,
    items: [
      {
        name: t("Nutella Banane", "نوتيلا موز", "Nutella Banana"),
        description: t("Filet de chocolat et rondelles de banane fraîche", "صلصة شوكولاتة وشرائح موز طازجة", "Chocolate drizzle and fresh banana slices"),
        price: null, verify: true, popular: true, photo: "/photos/crepe-nutella-banana.jpg",
      },
      {
        name: same("Oreo", "أوريو"),
        description: t("Chocolat, éclats d'Oreo, un Oreo entier et des gaufrettes roulées", "شوكولاتة، فتات أوريو، قطعة أوريو كاملة ورقائق ملفوفة", "Chocolate drizzle, Oreo crumble, a whole Oreo and wafer rolls"),
        price: null, verify: true, popular: true, photo: "/photos/crepe-oreo.jpg",
      },
      {
        name: t("Lotus / Speculoos", "لوتس / سبيكولوس", "Lotus / Speculoos"),
        description: t("Chocolat, éclats de speculoos, assiette poudrée de cacao", "شوكولاتة، فتات سبيكولوس، طبق مرشوش بالكاكاو", "Chocolate, speculoos crumble, cocoa-dusted plate"),
        price: null, verify: true, photo: "/photos/crepe-lotus.jpg",
      },
    ],
  },
  {
    slug: "coffee",
    name: t("Café", "قهوة", "Coffee"),
    tagline: t("Un moment calme, rien qu'à vous…", "لحظة هادئة، لك وحدك…", "A quiet moment, yours…"),
    doodle: "cup",
    items: [
      { name: same("Espresso", "إسبريسو"), price: 7 },
      { name: t("Double Espresso", "إسبريسو مزدوج", "Double Espresso"), price: 12 },
      { name: t("Chocolat chaud", "شوكولاتة ساخنة", "Hot Chocolate"), price: null, verify: true },
      { name: t("Ness Ness", "نص نص", "Ness Ness"), price: 7, popular: true },
      { name: same("Americano", "أمريكانو"), price: null, verify: true },
      { name: same("Latte", "لاتيه"), price: null, verify: true },
      { name: same("Cappuccino", "كابتشينو"), price: null, verify: true },
      { name: t("Moka", "موكا", "Mocha"), price: null, verify: true },
    ],
  },
  {
    slug: "iced-coffee",
    name: t("Café glacé", "قهوة مثلجة", "Iced Coffee"),
    tagline: null,
    doodle: "iced",
    items: [
      { name: t("Americano glacé", "أمريكانو مثلج", "Iced Americano"), price: null, verify: true },
      { name: t("Latte glacé", "لاتيه مثلج", "Iced Latte"), price: null, verify: true, popular: true },
      { name: t("Cappuccino glacé", "كابتشينو مثلج", "Iced Cappuccino"), price: null, verify: true },
      { name: t("Moka glacé", "موكا مثلجة", "Iced Mocha"), price: null, verify: true },
    ],
  },
  {
    slug: "moroccan-tea",
    name: t("Thé marocain", "أتاي مغربي", "Moroccan Tea"),
    tagline: t("Infusé de tradition…", "منقوع في التقاليد…", "Steeped in tradition…"),
    doodle: "tea",
    items: [{ name: t("Atay Mna3ne3 (thé à la menthe)", "أتاي منعنع", "Atay Mna3ne3 (mint tea)"), price: 7, popular: true }],
  },
  {
    slug: "milkshake",
    name: same("Milkshake", "ميلك شيك"),
    tagline: t("Un clin d'œil à la joie d'enfance, sans explication", "غمزة لفرحة الطفولة، بلا تفسير", "A wink to childlike joy, no explanation needed"),
    doodle: "shake",
    items: [
      { name: t("Vanille", "فانيليا", "Vanilla"), price: 25, verify: true },
      { name: t("Chocolat", "شوكولاتة", "Chocolate"), price: 25, verify: true },
      { name: same("Oreo", "أوريو"), price: 25, verify: true },
      { name: t("Fraise", "فراولة", "Strawberry"), price: 25, verify: true },
    ],
  },
  {
    slug: "mojito",
    name: same("Mojito", "موهيتو"),
    tagline: t("Rafraîchissant, sans être…", "منعش، دون أن يكون…", "Refreshing, without being…"),
    doodle: "mojito",
    items: [
      { name: t("Salam · mojito classique", "سلام · موهيتو كلاسيكي", "Salam · classic mojito"), price: 14, verify: true },
      { name: t("Chefchaouen · mojito bleu", "شفشاون · موهيتو أزرق", "Chefchaouen · blue mojito"), price: 16, popular: true },
      { name: t("Zahra · mojito fraise", "زهرة · موهيتو فراولة", "Zahra · strawberry mojito"), price: 16 },
    ],
  },
  {
    slug: "spark-fizz",
    name: same("Spark & Fizz", "سبارك آند فيز"),
    tagline: t("Pour les moments qui ont besoin d'un petit élan", "للحظات التي تحتاج دفعة صغيرة", "For the moments that need a little extra lift"),
    doodle: "soda",
    items: [
      {
        name: t("Soda", "مشروب غازي", "Soda"),
        description: t("Coca-Cola, Sprite, Poms, Hawai…", "كوكا كولا، سبرايت، بومس، هاواي…", "Coca-Cola, Sprite, Poms, Hawai…"),
        price: 8,
      },
      { name: same("Red Bull", "ريد بول"), price: 25 },
    ],
  },
  {
    slug: "frappuccino",
    name: same("Frappuccino", "فرابتشينو"),
    tagline: t("Pas trop excité, juste assez pour apaiser et relever", "ليس مفرطاً، فقط ما يكفي للتهدئة والانتعاش", "Not overexcited, just enough to soothe and lift"),
    doodle: "frappe",
    items: [
      { name: same("Caramel", "كراميل"), price: 29, popular: true },
      { name: t("Vanille", "فانيليا", "Vanilla"), price: 32 },
      { name: t("Noisette", "بندق", "Hazelnut"), price: 29 },
      { name: t("Chocolat", "شوكولاتة", "Chocolate"), price: 29 },
      { name: same("Oreo", "أوريو"), price: 29 },
    ],
  },
  {
    slug: "juices",
    name: t("Jus", "عصائر", "Juices"),
    tagline: t("Une pause plus profonde, à boire", "استراحة أعمق، تُشرب", "A deeper pause, made drinkable"),
    doodle: "juice",
    items: [
      { name: t("Pomme", "تفاح", "Apple"), price: 12 },
      { name: t("Banane", "موز", "Banana"), price: 12 },
      { name: t("Orange", "برتقال", "Orange"), price: 12 },
      { name: t("Avocat", "أفوكادو", "Avocado"), price: 15, popular: true },
    ],
  },
  {
    slug: "smoothies",
    name: same("Smoothies", "سموذي"),
    tagline: t(
      "Des mélanges frais et doux, pour les moments tendres et les jours colorés",
      "مزيج منعش ولطيف، للحظات الناعمة والأيام الملونة",
      "Fresh, feel-good blends for soft moments and colorful days",
    ),
    doodle: "juice",
    items: [
      { name: t("Ananas", "أناناس", "Pineapple"), price: 25 },
      { name: t("Banane", "موز", "Banana"), price: 23 },
      { name: t("Avocat", "أفوكادو", "Avocado"), price: 25 },
      { name: t("Fraise", "فراولة", "Strawberry"), price: 25 },
      { name: t("Chocolat", "شوكولاتة", "Chocolate"), price: 23 },
    ],
  },
];

export type SeedGift = { title: T; tier: "common" | "medium" | "rare"; weight: number; estCost: number; uses?: number };

/** Weights are relative: here they add up to 100, so they read as percentages. */
export const giftPool: SeedGift[] = [
  { title: t("Un cookie offert", "كوكيز مجاني", "A free cookie"), tier: "common", weight: 25, estCost: 4 },
  { title: t("Un shot de sirop offert", "جرعة شراب مجانية", "A free syrup shot"), tier: "common", weight: 25, estCost: 2 },
  { title: t("Un format plus grand offert", "حجم أكبر مجاناً", "A free size upgrade"), tier: "common", weight: 20, estCost: 3 },
  { title: t("Un café offert", "قهوة مجانية", "A free coffee"), tier: "medium", weight: 9, estCost: 4 },
  { title: t("Un thé marocain offert", "أتاي مغربي مجاني", "A free Moroccan tea"), tier: "medium", weight: 8, estCost: 3 },
  { title: t("Une mini crêpe offerte", "ميني كريب مجاني", "A free mini crêpe"), tier: "medium", weight: 8, estCost: 7 },
  { title: t("Une crêpe et une boisson offertes", "كريب ومشروب مجاناً", "A free crêpe and a drink"), tier: "rare", weight: 4, estCost: 22 },
  {
    title: t("Une boisson offerte chaque jour pendant une semaine", "مشروب مجاني كل يوم لمدة أسبوع", "A free drink every day for a week"),
    tier: "rare", weight: 1, estCost: 49, uses: 7,
  },
];
