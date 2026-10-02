"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { DrinkDoodle, type DoodleKind } from "@/components/brand/DrinkDoodle";
import { tr } from "@/lib/i18n-text";
import type { MenuCategory, MenuItem } from "@/lib/services/menu";
import {
  deleteItemAction,
  moveAction,
  saveCategoryAction,
  saveItemAction,
  toggleItemAction,
  uploadPhotoAction,
} from "@/app/[locale]/admin/actions";
import { I18nFields, NumberField, StatusMessage, Toggle, emptyText, useAdminAction } from "./form";

const DOODLES: DoodleKind[] = ["cup", "iced", "tea", "shake", "mojito", "soda", "frappe", "juice", "crepe"];
type Draft = Omit<MenuItem, "id" | "sort"> & { id: string | null };
type CategoryDraft = Pick<MenuCategory, "name" | "tagline" | "highlight" | "hidden"> & { id: string | null; doodle: DoodleKind };

function ItemForm({ item, categories, canUpload, onClose }: { item: Draft; categories: MenuCategory[]; canUpload: boolean; onClose: () => void }) {
  const t = useTranslations("admin.menu");
  const locale = useLocale();
  const [d, setD] = useState(item);
  const { pending, message, run } = useAdminAction();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  return (
    <form className="space-y-4 rounded-2xl bg-paper p-4 shadow-[var(--shadow-soft)]" onSubmit={(e) => (e.preventDefault(), run(() => saveItemAction(d), onClose))}>
      <I18nFields label={t("itemName")} value={d.name} onChange={(name) => setD({ ...d, name })} required />
      <I18nFields label={t("description")} value={d.description} onChange={(description) => setD({ ...d, description })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label={t("price")} hint={t("priceHint")} value={d.price} step={0.5} suffix="DH" onChange={(price) => setD({ ...d, price })} />
        <Field label={t("category")}>
          <Select value={d.categoryId} onChange={(e) => setD({ ...d, categoryId: e.target.value })}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {tr(c.name, locale)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t("photo")} hint={t("photoHint")}>
        <div className="flex flex-wrap items-center gap-2">
          {d.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.photoUrl} alt="" className="size-16 rounded-xl object-cover" />
          )}
          <Input className="min-w-0 flex-1" dir="ltr" placeholder="https://… or /photos/…" value={d.photoUrl ?? ""} onChange={(e) => setD({ ...d, photoUrl: e.target.value || null })} />
          {canUpload && (
            <label className="inline-flex min-h-12 cursor-pointer items-center rounded-xl border-2 border-wood px-4 font-bold">
              {uploading ? t("uploading") : t("upload")}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  setUploadError(null);
                  const form = new FormData();
                  form.set("file", file);
                  const res = await uploadPhotoAction(form);
                  setUploading(false);
                  if (res.ok) setD((cur) => ({ ...cur, photoUrl: res.url }));
                  else setUploadError(t("uploadFailed"));
                }}
              />
            </label>
          )}
        </div>
      </Field>
      {uploadError && <p className="text-sm text-[#9E2A20]">{uploadError}</p>}
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Toggle label={t("popular")} checked={d.popular} onChange={(popular) => setD({ ...d, popular })} />
        <Toggle label={t("soldOut")} checked={d.soldOut} onChange={(soldOut) => setD({ ...d, soldOut })} />
        <Toggle label={t("hidden")} checked={d.hidden} onChange={(hidden) => setD({ ...d, hidden })} />
        <Toggle label={t("needsVerify")} checked={d.needsVerify} onChange={(needsVerify) => setD({ ...d, needsVerify })} />
      </div>
      <StatusMessage message={message} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {t("save")}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          {t("cancel")}
        </Button>
        {d.id && (
          <Button variant="danger" className="ms-auto" disabled={pending} onClick={() => confirm(t("deleteConfirm")) && run(() => deleteItemAction(d.id!), onClose)}>
            {t("delete")}
          </Button>
        )}
      </div>
    </form>
  );
}

function CategoryForm({ category, onClose }: { category: CategoryDraft; onClose: () => void }) {
  const t = useTranslations("admin.menu");
  const [c, setC] = useState(category);
  const { pending, message, run } = useAdminAction();
  return (
    <form className="space-y-4 rounded-2xl bg-paper p-4 shadow-[var(--shadow-soft)]" onSubmit={(e) => (e.preventDefault(), run(() => saveCategoryAction(c), onClose))}>
      <I18nFields label={t("categoryName")} value={c.name} onChange={(name) => setC({ ...c, name })} required />
      <I18nFields label={t("tagline")} value={c.tagline} onChange={(tagline) => setC({ ...c, tagline })} />
      <fieldset>
        <legend className="mb-1.5 text-sm font-bold">{t("doodle")}</legend>
        <div className="flex flex-wrap gap-2">
          {DOODLES.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={c.doodle === k}
              aria-label={k}
              onClick={() => setC({ ...c, doodle: k })}
              className={`rounded-xl border-2 p-1 ${c.doodle === k ? "border-menu-green" : "border-transparent"}`}
            >
              <DrinkDoodle kind={k} size={44} />
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Toggle label={t("highlight")} checked={c.highlight} onChange={(highlight) => setC({ ...c, highlight })} />
        <Toggle label={t("hiddenCategory")} checked={c.hidden} onChange={(hidden) => setC({ ...c, hidden })} />
      </div>
      <StatusMessage message={message} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {t("save")}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}

function IconButton({ label, onClick, children, disabled }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="grid size-11 place-items-center rounded-xl text-lg hover:bg-wood-light/50 disabled:opacity-30">
      {children}
    </button>
  );
}

export function MenuEditor({ menu, canUpload }: { menu: MenuCategory[]; canUpload: boolean }) {
  const t = useTranslations("admin.menu");
  const locale = useLocale();
  const { pending, message, run } = useAdminAction();
  const [editing, setEditing] = useState<string | null>(null); // "cat:<id>" | "item:<id>" | "new-item:<catId>" | "new-cat"

  const newItem = (categoryId: string): Draft => ({
    id: null,
    categoryId,
    name: emptyText(),
    description: null,
    price: null,
    photoUrl: null,
    popular: false,
    soldOut: false,
    hidden: false,
    needsVerify: false,
  });

  return (
    <div className="space-y-5">
      <StatusMessage message={message} />
      {menu.map((c, ci) => (
        <section key={c.id} className={`menu-board p-4 ${c.hidden ? "opacity-60" : ""}`}>
          {editing === `cat:${c.id}` ? (
            <CategoryForm category={{ ...c, doodle: c.doodle as DoodleKind }} onClose={() => setEditing(null)} />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <DrinkDoodle kind={c.doodle as DoodleKind} size={44} />
                <div>
                  <h2 className="font-serif text-xl font-bold">
                    {tr(c.name, locale)} {c.highlight && <span className="text-sm text-zellige-red">★ {t("signature")}</span>}
                  </h2>
                  {c.tagline && <p className="text-sm italic text-wood-dark">{tr(c.tagline, locale)}</p>}
                </div>
              </div>
              <div className="flex items-center">
                <IconButton label={t("moveUp")} disabled={pending || ci === 0} onClick={() => run(() => moveAction("category", c.id, -1))}>↑</IconButton>
                <IconButton label={t("moveDown")} disabled={pending || ci === menu.length - 1} onClick={() => run(() => moveAction("category", c.id, 1))}>↓</IconButton>
                <Button variant="ghost" onClick={() => setEditing(`cat:${c.id}`)}>
                  {t("edit")}
                </Button>
              </div>
            </div>
          )}
          <hr className="dotted-rule my-3" />
          <ul className="space-y-1">
            {c.items.map((item, ii) =>
              editing === `item:${item.id}` ? (
                <li key={item.id}>
                  <ItemForm item={item} categories={menu} canUpload={canUpload} onClose={() => setEditing(null)} />
                </li>
              ) : (
                <li key={item.id} className={`flex flex-wrap items-center gap-2 rounded-xl px-2 py-1 hover:bg-cream ${item.hidden ? "opacity-50" : ""}`}>
                  <span className={`flex-1 font-semibold ${item.soldOut ? "line-through" : ""}`}>{tr(item.name, locale)}</span>
                  {item.needsVerify && <span className="rounded-full bg-zellige-yellow/40 px-2 text-xs font-bold">{t("verifyBadge")}</span>}
                  <span className="w-16 text-end font-bold tabular-nums">{item.price != null ? `${item.price} DH` : "—"}</span>
                  <Button variant={item.soldOut ? "flash" : "ghost"} className="!min-h-10 !px-3 text-sm" disabled={pending} onClick={() => run(() => toggleItemAction(item.id, "soldOut"))}>
                    {item.soldOut ? t("backInStock") : t("markSoldOut")}
                  </Button>
                  <IconButton label={item.hidden ? t("show") : t("hide")} disabled={pending} onClick={() => run(() => toggleItemAction(item.id, "hidden"))}>
                    {item.hidden ? "◌" : "●"}
                  </IconButton>
                  <IconButton label={t("moveUp")} disabled={pending || ii === 0} onClick={() => run(() => moveAction("item", item.id, -1))}>↑</IconButton>
                  <IconButton label={t("moveDown")} disabled={pending || ii === c.items.length - 1} onClick={() => run(() => moveAction("item", item.id, 1))}>↓</IconButton>
                  <Button variant="ghost" className="!min-h-10 !px-3 text-sm" onClick={() => setEditing(`item:${item.id}`)}>
                    {t("edit")}
                  </Button>
                </li>
              ),
            )}
          </ul>
          {editing === `new-item:${c.id}` ? (
            <div className="mt-3">
              <ItemForm item={newItem(c.id)} categories={menu} canUpload={canUpload} onClose={() => setEditing(null)} />
            </div>
          ) : (
            <Button variant="ghost" className="mt-2" onClick={() => setEditing(`new-item:${c.id}`)}>
              + {t("addItem")}
            </Button>
          )}
        </section>
      ))}
      {editing === "new-cat" ? (
        <CategoryForm category={{ id: null, name: emptyText(), tagline: null, doodle: "cup", highlight: false, hidden: false }} onClose={() => setEditing(null)} />
      ) : (
        <Button variant="secondary" onClick={() => setEditing("new-cat")}>
          + {t("addCategory")}
        </Button>
      )}
    </div>
  );
}
