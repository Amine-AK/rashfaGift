"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Field";
import type { I18nText } from "@/lib/i18n-text";

export const emptyText = (): I18nText => ({ fr: "", ar: "", en: "" });

/** One text in the three app languages, side by side. */
export function I18nFields({ label, value, onChange, required = false }: { label: string; value: I18nText | null; onChange: (v: I18nText) => void; required?: boolean }) {
  const v = value ?? emptyText();
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-bold">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {(["fr", "ar", "en"] as const).map((l) => (
          <label key={l} className="relative block">
            <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-xs font-bold uppercase text-wood-dark">{l}</span>
            <Input
              dir={l === "ar" ? "rtl" : "ltr"}
              lang={l}
              className="!ps-10"
              required={required && l === "fr"}
              value={v[l]}
              onChange={(e) => onChange({ ...v, [l]: e.target.value })}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function NumberField({ label, hint, value, onChange, step = 1, min = 0, suffix }: { label: string; hint?: string; value: number | null; onChange: (v: number | null) => void; step?: number; min?: number; suffix?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      <span className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
        {suffix && <span className="shrink-0 text-sm text-wood-dark">{suffix}</span>}
      </span>
      {hint && <span className="mt-1 block text-xs text-wood-dark">{hint}</span>}
    </label>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3">
      <input type="checkbox" className="size-5 accent-menu-green" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm font-bold">{label}</span>
    </label>
  );
}

type ActionResult = { ok: true } | { ok: false; error: string };

/** Runs a server action and keeps a short status message. */
export function useAdminAction() {
  const t = useTranslations("admin");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const run = (fn: () => Promise<ActionResult>, onSuccess?: () => void) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setMessage({ tone: "success", text: t("saved") });
        onSuccess?.();
      } else setMessage({ tone: "error", text: t.has(`errors.${res.error}`) ? t(`errors.${res.error}`) : t("errors.generic") });
    });
  return { pending, message, run, clear: () => setMessage(null) };
}

export function StatusMessage({ message }: { message: { tone: "success" | "error"; text: string } | null }) {
  if (!message) return null;
  return (
    <p role="status" className={`rounded-xl px-4 py-2 text-sm font-bold ${message.tone === "success" ? "bg-plant/15 text-menu-green-dark" : "bg-zellige-red/10 text-[#9E2A20]"}`}>
      {message.text}
    </p>
  );
}
