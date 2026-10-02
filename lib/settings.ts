import "server-only";
import { cache } from "react";
import { sql, type Tx } from "./db";
import { resolveSettings, settingsSchema, type Settings } from "./settings-schema";

export type { Settings } from "./settings-schema";

export async function loadSettings(db: typeof sql | Tx = sql): Promise<Settings> {
  const rows = await db<{ value: unknown }[]>`select value from settings where key = 'rules'`;
  return resolveSettings(rows[0]?.value);
}

/** Request-scoped settings for server components. */
export const getSettings = cache(() => loadSettings());

export async function saveSettings(input: unknown): Promise<Settings> {
  const value = settingsSchema.parse(input);
  if (value.levelFamilyMinVisits <= value.levelRegularMinVisits) {
    throw new Error("levels_order");
  }
  await sql`
    insert into settings (key, value) values ('rules', ${sql.json(value as never)})
    on conflict (key) do update set value = excluded.value, updated_at = now()`;
  return value;
}
