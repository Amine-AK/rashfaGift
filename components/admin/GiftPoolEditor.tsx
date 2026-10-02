"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { tr, type I18nText } from "@/lib/i18n-text";
import { deleteGiftAction, saveGiftAction } from "@/app/[locale]/admin/actions";
import { I18nFields, NumberField, StatusMessage, Toggle, emptyText, useAdminAction } from "./form";

export type PoolRow = { id: string | null; title: I18nText; tier: "common" | "medium" | "rare"; weight: number; estCost: number; uses: number; active: boolean };

const tierStyle = { common: "bg-zellige-teal/15", medium: "bg-zellige-blue/10", rare: "bg-zellige-yellow/30" };

function GiftRow({ gift, odds, onDone }: { gift: PoolRow; odds: number; onDone?: () => void }) {
  const t = useTranslations("admin.gifts");
  const locale = useLocale();
  const [g, setG] = useState(gift);
  const [open, setOpen] = useState(!gift.id);
  const { pending, message, run } = useAdminAction();

  if (!open) {
    return (
      <li className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 ${tierStyle[g.tier]} ${g.active ? "" : "opacity-60"}`}>
        <div>
          <p className="font-bold">{tr(g.title, locale)}</p>
          <p className="text-sm text-wood-dark">
            {t(`tier.${g.tier}`)} · {t("odds", { pct: odds.toFixed(1) })} · {t("cost", { cost: g.estCost })}
            {g.uses > 1 ? ` · ${t("usesShort", { uses: g.uses })}` : ""}
            {!g.active ? ` · ${t("inactive")}` : ""}
          </p>
        </div>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          {t("edit")}
        </Button>
      </li>
    );
  }

  return (
    <li className="space-y-4 rounded-2xl bg-paper p-4 shadow-[var(--shadow-soft)]">
      <I18nFields label={t("name")} value={g.title} onChange={(title) => setG({ ...g, title })} required />
      <div className="grid gap-4 sm:grid-cols-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold">{t("tierLabel")}</span>
          <Select value={g.tier} onChange={(e) => setG({ ...g, tier: e.target.value as PoolRow["tier"] })}>
            {(["common", "medium", "rare"] as const).map((v) => (
              <option key={v} value={v}>
                {t(`tier.${v}`)}
              </option>
            ))}
          </Select>
        </label>
        <NumberField label={t("weight")} hint={t("weightHint")} value={g.weight} min={1} onChange={(v) => setG({ ...g, weight: v ?? 1 })} />
        <NumberField label={t("estCost")} value={g.estCost} step={0.5} suffix="DH" onChange={(v) => setG({ ...g, estCost: v ?? 0 })} />
        <NumberField label={t("uses")} hint={t("usesHint")} value={g.uses} min={1} onChange={(v) => setG({ ...g, uses: v ?? 1 })} />
      </div>
      <Toggle label={t("active")} checked={g.active} onChange={(active) => setG({ ...g, active })} />
      <StatusMessage message={message} />
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={() => run(() => saveGiftAction(g), () => (gift.id ? setOpen(false) : onDone?.()))}>
          {t("save")}
        </Button>
        <Button variant="ghost" onClick={() => (gift.id ? (setG(gift), setOpen(false)) : onDone?.())}>
          {t("cancel")}
        </Button>
        {gift.id && (
          <Button variant="danger" className="ms-auto" disabled={pending} onClick={() => confirm(t("deleteConfirm")) && run(() => deleteGiftAction(gift.id!))}>
            {t("delete")}
          </Button>
        )}
      </div>
    </li>
  );
}

export function GiftPoolEditor({ pool }: { pool: PoolRow[] }) {
  const t = useTranslations("admin.gifts");
  const [adding, setAdding] = useState(false);
  const total = pool.filter((g) => g.active).reduce((s, g) => s + g.weight, 0);
  const tierShare = (tier: PoolRow["tier"]) => (total ? (pool.filter((g) => g.active && g.tier === tier).reduce((s, g) => s + g.weight, 0) / total) * 100 : 0);

  return (
    <div className="space-y-4">
      <p className="flex flex-wrap gap-2 text-sm">
        {(["common", "medium", "rare"] as const).map((tier) => (
          <span key={tier} className={`rounded-full px-3 py-1 font-bold ${tierStyle[tier]}`}>
            {t(`tier.${tier}`)} {tierShare(tier).toFixed(0)}%
          </span>
        ))}
      </p>
      <ul className="space-y-2">
        {pool.map((g) => (
          <GiftRow key={g.id} gift={g} odds={g.active && total ? (g.weight / total) * 100 : 0} />
        ))}
        {adding && (
          <GiftRow gift={{ id: null, title: emptyText(), tier: "common", weight: 10, estCost: 5, uses: 1, active: true }} odds={0} onDone={() => setAdding(false)} />
        )}
      </ul>
      {!adding && (
        <Button variant="gift" onClick={() => setAdding(true)}>
          {t("add")}
        </Button>
      )}
    </div>
  );
}
