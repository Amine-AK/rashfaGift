"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { toLocalInputValue } from "@/lib/time";
import type { I18nText } from "@/lib/i18n-text";
import { createOfferAction } from "@/app/[locale]/admin/actions";
import { I18nFields, NumberField, StatusMessage, emptyText, useAdminAction } from "./form";

const QUARTER = 15 * 60_000;

export function OfferForm({ items, timezone }: { items: { id: string; label: string }[]; timezone: string }) {
  const t = useTranslations("admin.offers");
  const { pending, message, run } = useAdminAction();
  const [title, setTitle] = useState<I18nText>(emptyText());
  const [reward, setReward] = useState<I18nText>(emptyText());
  const [startsAt, setStartsAt] = useState(() => toLocalInputValue(new Date(Math.ceil(Date.now() / QUARTER) * QUARTER), timezone));
  const [endsAt, setEndsAt] = useState(() => toLocalInputValue(new Date(Math.ceil(Date.now() / QUARTER) * QUARTER + 60 * 60_000), timezone));
  const [maxQty, setMaxQty] = useState<number | null>(10);
  const [target, setTarget] = useState<"all" | "level" | "inactive">("all");
  const [targetLevel, setTargetLevel] = useState<"newcomer" | "regular" | "family">("regular");
  const [menuItemId, setMenuItemId] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => createOfferAction({ title, reward, startsAt, endsAt, maxQty: maxQty ?? 0, target, targetLevel: target === "level" ? targetLevel : null, menuItemId: menuItemId || null }),
          () => {
            setTitle(emptyText());
            setReward(emptyText());
          },
        );
      }}
    >
      <I18nFields label={t("titleLabel")} value={title} onChange={setTitle} required />
      <p className="-mt-2 text-xs text-wood-dark">{t("titleExample")}</p>
      <I18nFields label={t("rewardLabel")} value={reward} onChange={setReward} required />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("starts")}>
          <Input type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </Field>
        <Field label={t("ends")}>
          <Input type="datetime-local" required value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </Field>
        <NumberField label={t("maxQty")} value={maxQty} onChange={setMaxQty} min={1} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("product")}>
          <Select value={menuItemId} onChange={(e) => setMenuItemId(e.target.value)}>
            <option value="">{t("anyProduct")}</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("audience")}>
          <div className="flex gap-2">
            <Select value={target} onChange={(e) => setTarget(e.target.value as typeof target)}>
              {(["all", "level", "inactive"] as const).map((v) => (
                <option key={v} value={v}>
                  {t(`target.${v}`)}
                </option>
              ))}
            </Select>
            {target === "level" && (
              <Select value={targetLevel} onChange={(e) => setTargetLevel(e.target.value as typeof targetLevel)}>
                {(["newcomer", "regular", "family"] as const).map((v) => (
                  <option key={v} value={v}>
                    {t(`level.${v}`)}
                  </option>
                ))}
              </Select>
            )}
          </div>
        </Field>
      </div>
      <StatusMessage message={message} />
      <Button type="submit" variant="flash" size="lg" disabled={pending}>
        {t("create")}
      </Button>
    </form>
  );
}
