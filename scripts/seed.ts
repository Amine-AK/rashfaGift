/**
 * Seeds the menu and the gift pool. Safe to re-run: each part is only inserted
 * when its table is empty, so it never overwrites the owner's edits.
 *   DATABASE_URL=... npm run db:seed
 */
import postgres from "postgres";
import { giftPool, menu } from "./seed-data";

export async function seed(url: string, log = console.log) {
  const sql = postgres(url, { prepare: false, max: 1 });
  try {
    const [{ count: categories }] = await sql<{ count: number }[]>`select count(*)::int as count from menu_categories`;
    if (categories === 0) {
      await sql.begin(async (tx) => {
        for (const [ci, cat] of menu.entries()) {
          const [row] = await tx<{ id: string }[]>`
            insert into menu_categories (slug, name, tagline, doodle, sort, highlight)
            values (${cat.slug}, ${tx.json(cat.name)}, ${cat.tagline ? tx.json(cat.tagline) : null}, ${cat.doodle}, ${ci}, ${cat.highlight ?? false})
            returning id`;
          for (const [ii, item] of cat.items.entries()) {
            await tx`
              insert into menu_items (category_id, name, description, price, photo_url, popular, needs_verify, sort)
              values (${row.id}, ${tx.json(item.name)}, ${item.description ? tx.json(item.description) : null},
                      ${item.price}, ${item.photo ?? null}, ${item.popular ?? false}, ${item.verify ?? false}, ${ii})`;
          }
        }
      });
      log(`menu: ${menu.length} categories seeded`);
    } else log("menu: already present, left untouched");

    const [{ count: gifts }] = await sql<{ count: number }[]>`select count(*)::int as count from gift_pool`;
    if (gifts === 0) {
      for (const g of giftPool) {
        await sql`insert into gift_pool (title, tier, weight, est_cost, uses)
                  values (${sql.json(g.title)}, ${g.tier}, ${g.weight}, ${g.estCost}, ${g.uses ?? 1})`;
      }
      log(`gift pool: ${giftPool.length} gifts seeded`);
    } else log("gift pool: already present, left untouched");
  } finally {
    await sql.end();
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  seed(url);
}
