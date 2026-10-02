import "server-only";
import { sql } from "../db";
import type { I18nText } from "../i18n-text";

export type MenuItem = {
  id: string;
  categoryId: string;
  name: I18nText;
  description: I18nText | null;
  price: number | null;
  photoUrl: string | null;
  popular: boolean;
  soldOut: boolean;
  hidden: boolean;
  needsVerify: boolean;
  sort: number;
};

export type MenuCategory = {
  id: string;
  slug: string;
  name: I18nText;
  tagline: I18nText | null;
  doodle: string;
  sort: number;
  highlight: boolean;
  hidden: boolean;
  items: MenuItem[];
};

export async function loadMenu({ includeHidden = false } = {}): Promise<MenuCategory[]> {
  const categories = await sql<Omit<MenuCategory, "items">[]>`
    select id, slug, name, tagline, doodle, sort, highlight, hidden from menu_categories
    where ${includeHidden} or not hidden order by sort, slug`;
  const items = await sql<MenuItem[]>`
    select id, category_id, name, description, price, photo_url, popular, sold_out, hidden, needs_verify, sort
    from menu_items where ${includeHidden} or not hidden order by sort`;
  return categories.map((c) => ({ ...c, items: items.filter((i) => i.categoryId === c.id) }));
}
