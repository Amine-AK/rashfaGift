"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import type { Settings } from "@/lib/settings-schema";
import { saveRulesAction } from "@/app/[locale]/admin/actions";
import { I18nFields, NumberField, StatusMessage, Toggle, useAdminAction } from "./form";

type NumKey = { [K in keyof Settings]: Settings[K] extends number ? K : never }[keyof Settings];

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="mb-4 font-serif text-xl font-bold">{title}</h2>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

export function RulesForm({ initial }: { initial: Settings }) {
  const t = useTranslations("admin.rules");
  const [s, setS] = useState(initial);
  const { pending, message, run } = useAdminAction();
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setS((prev) => ({ ...prev, [key]: value }));
  const num = (key: NumKey, suffix?: string, step = 1) => (
    <NumberField label={t(`f.${key}`)} hint={t.has(`h.${key}`) ? t(`h.${key}`) : undefined} value={s[key]} step={step} suffix={suffix} onChange={(v) => set(key, v ?? 0)} />
  );

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveRulesAction(s));
      }}
    >
      <Group title={t("visits")}>
        <div className="grid gap-4 sm:grid-cols-3">
          {num("minOrderAmount", "DH", 0.5)}
          {num("visitCooldownHours", t("hours"))}
          {num("instantDiscountPercent", "%")}
        </div>
      </Group>

      <Group title={t("mystery")}>
        <div className="grid gap-4 sm:grid-cols-4">
          {num("pointsForGift")}
          {num("maxGiftValue", "DH")}
          {num("giftValidityDays", t("days"))}
          {num("rareGiftMonthlyCap")}
        </div>
      </Group>

      <Group title={t("levels")}>
        <div className="grid gap-4 sm:grid-cols-2">
          {num("levelRegularMinVisits", t("visitsUnit"))}
          {num("levelFamilyMinVisits", t("visitsUnit"))}
        </div>
        {(["newcomer", "regular", "family"] as const).map((level) => (
          <I18nFields key={level} label={t(`perk.${level}`)} value={s.levelPerks[level]} onChange={(v) => set("levelPerks", { ...s.levelPerks, [level]: v })} />
        ))}
      </Group>

      <Group title={t("notifications")}>
        <div className="grid gap-4 sm:grid-cols-3">
          {num("maxPushPerWeek")}
          {num("pushQuietStartHour", "h")}
          {num("pushQuietEndHour", "h")}
        </div>
      </Group>

      {(["welcome", "winback", "birthday"] as const).map((kind) => (
        <Group key={kind} title={t(`${kind}Title`)}>
          <Toggle label={t("enabled")} checked={s[`${kind}${kind === "welcome" ? "GiftEnabled" : "Enabled"}` as "welcomeGiftEnabled"]} onChange={(v) => set(`${kind}${kind === "welcome" ? "GiftEnabled" : "Enabled"}` as "welcomeGiftEnabled", v)} />
          <div className="grid gap-4 sm:grid-cols-2">
            {kind === "winback" && num("winbackDays", t("days"))}
            {num(`${kind}GiftValidityDays` as NumKey, t("days"))}
          </div>
          <I18nFields label={t("giftText")} value={s[`${kind}Gift`]} onChange={(v) => set(`${kind}Gift`, v)} required />
        </Group>
      ))}

      <Group title={t("other")}>
        <div className="grid gap-4 sm:grid-cols-2">
          {num("maxReferralsPerMonth")}
          <Field label={t("f.timezone")} hint={t("h.timezone")}>
            <Input value={s.timezone} onChange={(e) => set("timezone", e.target.value)} />
          </Field>
        </div>
      </Group>

      <div className="sticky bottom-0 -mx-4 space-y-2 bg-cream/95 px-4 py-3 backdrop-blur">
        <StatusMessage message={message} />
        <Button type="submit" size="lg" disabled={pending}>
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
