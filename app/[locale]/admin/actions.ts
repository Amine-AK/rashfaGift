"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { sql } from "@/lib/db";
import { env } from "@/lib/env";
import { i18nText } from "@/lib/i18n-text";
import { AuthError, requireAdmin } from "@/lib/auth/staff";
import { loadSettings, saveSettings } from "@/lib/settings";
import { parseLocalDateTime } from "@/lib/time";
import { runFlashPushes } from "@/lib/services/automation";

type Result = { ok: true } | { ok: false; error: string };

async function admin() {
  return requireAdmin();
}

async function audit(staffId: string, action: string, payload: object) {
  await sql`insert into audit_log (staff_id, action, payload) values (${staffId}, ${action}, ${sql.json(payload as never)})`;
}

function done(path: string): Result {
  revalidatePath(`/[locale]/admin${path}`, "page");
  return { ok: true };
}

function failed(err: unknown): Result {
  if (err instanceof AuthError) return { ok: false, error: "forbidden" };
  if (err instanceof z.ZodError) return { ok: false, error: "invalid" };
  if (err instanceof Error && ["levels_order", "pin_taken", "storage_off", "dates"].includes(err.message)) return { ok: false, error: err.message };
  console.error(err);
  return { ok: false, error: "generic" };
}

/* ── Rules ─────────────────────────────────────────────────────────────── */

export async function saveRulesAction(input: unknown): Promise<Result> {
  try {
    const me = await admin();
    const saved = await saveSettings(input);
    await audit(me.id, "rules_updated", saved);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return failed(err);
  }
}

/* ── Flash offers ──────────────────────────────────────────────────────── */

const offerSchema = z.object({
  title: i18nText,
  reward: i18nText,
  startsAt: z.string(),
  endsAt: z.string(),
  maxQty: z.number().int().min(1).max(1000),
  target: z.enum(["all", "level", "inactive"]),
  targetLevel: z.enum(["newcomer", "regular", "family"]).nullable(),
  menuItemId: z.string().uuid().nullable(),
});

export async function createOfferAction(input: z.input<typeof offerSchema>): Promise<Result> {
  try {
    const me = await admin();
    const o = offerSchema.parse(input);
    const s = await loadSettings();
    const startsAt = parseLocalDateTime(o.startsAt, s.timezone);
    const endsAt = parseLocalDateTime(o.endsAt, s.timezone);
    if (!startsAt || !endsAt || endsAt <= startsAt || endsAt <= new Date()) throw new Error("dates");
    const [row] = await sql<{ id: string }[]>`
      insert into flash_offers (title, reward, menu_item_id, starts_at, ends_at, max_qty, target, target_level, created_by)
      values (${sql.json(o.title)}, ${sql.json(o.reward)}, ${o.menuItemId}, ${startsAt}, ${endsAt}, ${o.maxQty},
              ${o.target}, ${o.target === "level" ? o.targetLevel : null}, ${me.id})
      returning id`;
    await audit(me.id, "flash_created", { id: row.id, ...o });
    // Starting right away? Send the notifications now rather than at the next scheduler tick.
    if (startsAt <= new Date()) await runFlashPushes(s);
    return done("/offers");
  } catch (err) {
    return failed(err);
  }
}

export async function stopOfferAction(id: string): Promise<Result> {
  try {
    const me = await admin();
    await sql`update flash_offers set stopped_at = now() where id = ${z.string().uuid().parse(id)} and stopped_at is null`;
    await audit(me.id, "flash_stopped", { id });
    return done("/offers");
  } catch (err) {
    return failed(err);
  }
}

/* ── Gift pool ─────────────────────────────────────────────────────────── */

const giftSchema = z.object({
  id: z.string().uuid().nullable(),
  title: i18nText,
  tier: z.enum(["common", "medium", "rare"]),
  weight: z.number().int().min(1).max(10_000),
  estCost: z.number().min(0).max(10_000),
  uses: z.number().int().min(1).max(31),
  active: z.boolean(),
});

export async function saveGiftAction(input: z.input<typeof giftSchema>): Promise<Result> {
  try {
    const me = await admin();
    const g = giftSchema.parse(input);
    if (g.id) {
      await sql`update gift_pool set title = ${sql.json(g.title)}, tier = ${g.tier}, weight = ${g.weight},
                est_cost = ${g.estCost}, uses = ${g.uses}, active = ${g.active} where id = ${g.id}`;
    } else {
      await sql`insert into gift_pool (title, tier, weight, est_cost, uses, active)
                values (${sql.json(g.title)}, ${g.tier}, ${g.weight}, ${g.estCost}, ${g.uses}, ${g.active})`;
    }
    await audit(me.id, "gift_pool_saved", g);
    return done("/gifts");
  } catch (err) {
    return failed(err);
  }
}

export async function deleteGiftAction(id: string): Promise<Result> {
  try {
    const me = await admin();
    // Gifts already given keep their own copy of the title, so deleting is safe.
    await sql`delete from gift_pool where id = ${z.string().uuid().parse(id)}`;
    await audit(me.id, "gift_pool_deleted", { id });
    return done("/gifts");
  } catch (err) {
    return failed(err);
  }
}

/* ── Menu ──────────────────────────────────────────────────────────────── */

const optionalText = i18nText.nullable();

const categorySchema = z.object({
  id: z.string().uuid().nullable(),
  name: i18nText,
  tagline: optionalText,
  doodle: z.enum(["cup", "iced", "tea", "shake", "mojito", "soda", "frappe", "juice", "crepe"]),
  highlight: z.boolean(),
  hidden: z.boolean(),
});

function slugify(text: string) {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `cat-${Date.now()}`
  );
}

const emptyToNull = (t: { fr: string; ar: string; en: string } | null) => (t && (t.fr || t.ar || t.en) ? t : null);

export async function saveCategoryAction(input: z.input<typeof categorySchema>): Promise<Result> {
  try {
    const me = await admin();
    const c = categorySchema.parse(input);
    const tagline = emptyToNull(c.tagline);
    if (c.id) {
      await sql`update menu_categories set name = ${sql.json(c.name)}, tagline = ${tagline ? sql.json(tagline) : null},
                doodle = ${c.doodle}, highlight = ${c.highlight}, hidden = ${c.hidden} where id = ${c.id}`;
    } else {
      const [{ next }] = await sql<{ next: number }[]>`select coalesce(max(sort), -1)::int + 1 as next from menu_categories`;
      await sql`insert into menu_categories (slug, name, tagline, doodle, highlight, hidden, sort)
                values (${`${slugify(c.name.en || c.name.fr)}-${next}`}, ${sql.json(c.name)}, ${tagline ? sql.json(tagline) : null},
                        ${c.doodle}, ${c.highlight}, ${c.hidden}, ${next})`;
    }
    await audit(me.id, "menu_category_saved", c);
    revalidatePath("/[locale]/menu", "page");
    return done("/menu");
  } catch (err) {
    return failed(err);
  }
}

const itemSchema = z.object({
  id: z.string().uuid().nullable(),
  categoryId: z.string().uuid(),
  name: i18nText,
  description: optionalText,
  price: z.number().min(0).max(10_000).nullable(),
  photoUrl: z.string().max(500).nullable(),
  popular: z.boolean(),
  soldOut: z.boolean(),
  hidden: z.boolean(),
  needsVerify: z.boolean(),
});

export async function saveItemAction(input: z.input<typeof itemSchema>): Promise<Result> {
  try {
    const me = await admin();
    const i = itemSchema.parse(input);
    const description = emptyToNull(i.description);
    const photo = i.photoUrl?.trim() || null;
    if (photo && !/^(https:\/\/|\/photos\/)/.test(photo)) throw new z.ZodError([]);
    if (i.id) {
      await sql`update menu_items set category_id = ${i.categoryId}, name = ${sql.json(i.name)},
                description = ${description ? sql.json(description) : null}, price = ${i.price}, photo_url = ${photo},
                popular = ${i.popular}, sold_out = ${i.soldOut}, hidden = ${i.hidden}, needs_verify = ${i.needsVerify}
                where id = ${i.id}`;
    } else {
      const [{ next }] = await sql<{ next: number }[]>`
        select coalesce(max(sort), -1)::int + 1 as next from menu_items where category_id = ${i.categoryId}`;
      await sql`insert into menu_items (category_id, name, description, price, photo_url, popular, sold_out, hidden, needs_verify, sort)
                values (${i.categoryId}, ${sql.json(i.name)}, ${description ? sql.json(description) : null}, ${i.price}, ${photo},
                        ${i.popular}, ${i.soldOut}, ${i.hidden}, ${i.needsVerify}, ${next})`;
    }
    await audit(me.id, "menu_item_saved", i);
    revalidatePath("/[locale]/menu", "page");
    return done("/menu");
  } catch (err) {
    return failed(err);
  }
}

/** Quick toggles from the menu list (sold out today, hidden). */
export async function toggleItemAction(id: string, field: "soldOut" | "hidden"): Promise<Result> {
  try {
    const me = await admin();
    const uuid = z.string().uuid().parse(id);
    if (field === "soldOut") await sql`update menu_items set sold_out = not sold_out where id = ${uuid}`;
    else await sql`update menu_items set hidden = not hidden where id = ${uuid}`;
    await audit(me.id, "menu_item_toggled", { id, field });
    revalidatePath("/[locale]/menu", "page");
    return done("/menu");
  } catch (err) {
    return failed(err);
  }
}

export async function deleteItemAction(id: string): Promise<Result> {
  try {
    const me = await admin();
    await sql`delete from menu_items where id = ${z.string().uuid().parse(id)}`;
    await audit(me.id, "menu_item_deleted", { id });
    revalidatePath("/[locale]/menu", "page");
    return done("/menu");
  } catch (err) {
    return failed(err);
  }
}

/** Swap a category or item with its neighbour (reordering with ↑ / ↓). */
export async function moveAction(kind: "category" | "item", id: string, direction: -1 | 1): Promise<Result> {
  try {
    await admin();
    const uuid = z.string().uuid().parse(id);
    await sql.begin(async (tx) => {
      if (kind === "category") {
        const rows = await tx<{ id: string }[]>`select id from menu_categories order by sort, slug for update`;
        const i = rows.findIndex((r) => r.id === uuid);
        const j = i + direction;
        if (i < 0 || j < 0 || j >= rows.length) return;
        [rows[i], rows[j]] = [rows[j], rows[i]];
        for (const [sort, r] of rows.entries()) await tx`update menu_categories set sort = ${sort} where id = ${r.id}`;
      } else {
        const [item] = await tx<{ categoryId: string }[]>`select category_id from menu_items where id = ${uuid}`;
        if (!item) return;
        const rows = await tx<{ id: string }[]>`select id from menu_items where category_id = ${item.categoryId} order by sort for update`;
        const i = rows.findIndex((r) => r.id === uuid);
        const j = i + direction;
        if (j < 0 || j >= rows.length) return;
        [rows[i], rows[j]] = [rows[j], rows[i]];
        for (const [sort, r] of rows.entries()) await tx`update menu_items set sort = ${sort} where id = ${r.id}`;
      }
    });
    revalidatePath("/[locale]/menu", "page");
    return done("/menu");
  } catch (err) {
    return failed(err);
  }
}

/** Uploads a real product photo to Supabase Storage (bucket "menu") and returns its public URL. */
export async function uploadPhotoAction(form: FormData): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    await admin();
    const storage = env.supabaseStorage();
    if (!storage) throw new Error("storage_off");
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > 5_000_000 || !/^image\/(jpeg|png|webp)$/.test(file.type)) {
      throw new z.ZodError([]);
    }
    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `items/${crypto.randomUUID()}.${ext}`;
    const client = createClient(storage.url, storage.serviceRoleKey, { auth: { persistSession: false } });
    const { error } = await client.storage.from("menu").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    if (error) throw error;
    return { ok: true, url: client.storage.from("menu").getPublicUrl(path).data.publicUrl };
  } catch (err) {
    const r = failed(err);
    return { ok: false, error: r.ok ? "generic" : r.error };
  }
}

/* ── Team ──────────────────────────────────────────────────────────────── */

async function assertPinFree(pin: string, exceptId: string | null) {
  const staff = await sql<{ id: string; pinHash: string }[]>`select id, pin_hash from staff where active`;
  for (const s of staff) if (s.id !== exceptId && (await bcrypt.compare(pin, s.pinHash))) throw new Error("pin_taken");
}

const staffSchema = z
  .object({ name: z.string().trim().min(1).max(40), pin: z.string().regex(/^\d{4,12}$/), role: z.enum(["barista", "admin"]) })
  .refine((s) => s.role === "barista" || s.pin.length >= 6, { path: ["pin"] });

export async function createStaffAction(input: z.input<typeof staffSchema>): Promise<Result> {
  try {
    const me = await admin();
    const s = staffSchema.parse(input);
    await assertPinFree(s.pin, null);
    await sql`insert into staff (name, pin_hash, role) values (${s.name}, ${await bcrypt.hash(s.pin, 10)}, ${s.role})`;
    await audit(me.id, "staff_created", { name: s.name, role: s.role });
    return done("/team");
  } catch (err) {
    return failed(err);
  }
}

export async function resetPinAction(id: string, pin: string): Promise<Result> {
  try {
    const me = await admin();
    const uuid = z.string().uuid().parse(id);
    const [target] = await sql<{ role: string }[]>`select role from staff where id = ${uuid}`;
    if (!target) throw new z.ZodError([]);
    z.string().regex(target.role === "admin" ? /^\d{6,12}$/ : /^\d{4,12}$/).parse(pin);
    await assertPinFree(pin, uuid);
    await sql`update staff set pin_hash = ${await bcrypt.hash(pin, 10)} where id = ${uuid}`;
    await audit(me.id, "staff_pin_reset", { id });
    return done("/team");
  } catch (err) {
    return failed(err);
  }
}

export async function setStaffActiveAction(id: string, active: boolean): Promise<Result> {
  try {
    const me = await admin();
    const uuid = z.string().uuid().parse(id);
    if (uuid === me.id && !active) throw new z.ZodError([]); // never lock yourself out
    await sql`update staff set active = ${active} where id = ${uuid}`;
    await audit(me.id, active ? "staff_activated" : "staff_deactivated", { id });
    return done("/team");
  } catch (err) {
    return failed(err);
  }
}
