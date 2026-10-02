"use client";

import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setPreferredChoice } from "@/lib/actions/customer";

type Choice = "discount" | "save" | null;

export function ChoicePreference({ initial, percent }: { initial: Choice; percent: number }) {
  const t = useTranslations("home");
  const [, startTransition] = useTransition();
  const [choice, setChoice] = useOptimistic<Choice>(initial);

  const pick = (c: Exclude<Choice, null>) =>
    startTransition(async () => {
      const next = choice === c ? null : c;
      setChoice(next);
      await setPreferredChoice(next);
    });

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold">{t("todayIWant")}</legend>
      <div className="grid grid-cols-2 gap-2">
        {(["discount", "save"] as const).map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={choice === c}
            onClick={() => pick(c)}
            className={`min-h-16 rounded-2xl border-2 px-3 py-2 text-start transition ${
              choice === c ? "border-menu-green bg-menu-green text-white" : "border-wood/40 bg-paper"
            }`}
          >
            <span className="block font-bold">{c === "discount" ? t("treatNow") : t("saveIt")}</span>
            <span className={`block text-xs ${choice === c ? "text-white/90" : "text-wood-dark"}`}>
              {c === "discount" ? t("treatNowHint", { percent }) : t("saveItHint")}
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
