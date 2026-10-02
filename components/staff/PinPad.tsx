"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Notice } from "@/components/ui/Field";
import { loginStaff } from "@/app/[locale]/staff/actions";
import { feedback } from "./feedback";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"];

export function PinPad() {
  const t = useTranslations("staff");
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      setError(null);
      const res = await loginStaff(pin);
      if (!res.ok) {
        feedback("error");
        setPin("");
        return setError(t(`errors.${res.error}`));
      }
      router.replace("/staff");
    });

  const press = (k: string) => {
    if (k === "⌫") return setPin((p) => p.slice(0, -1));
    if (k === "OK") return pin.length >= 4 && submit();
    setPin((p) => (p.length < 12 ? p + k : p));
  };

  return (
    <div className="mx-auto mt-6 max-w-xs space-y-5">
      <div className="flex h-14 items-center justify-center gap-3" aria-live="polite" aria-label={t("pinEntered", { count: pin.length })}>
        {Array.from({ length: Math.max(4, pin.length) }, (_, i) => (
          <span key={i} className={`size-4 rounded-sm ${i < pin.length ? "bg-menu-green" : "bg-wood-light"}`} />
        ))}
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="grid grid-cols-3 gap-3" dir="ltr">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            disabled={pending}
            onClick={() => press(k)}
            aria-label={k === "⌫" ? t("erase") : k === "OK" ? t("enter") : k}
            className={`min-h-16 rounded-2xl text-2xl font-extrabold shadow-[var(--shadow-soft)] transition active:scale-95 disabled:opacity-60 ${
              k === "OK" ? "bg-menu-green text-white" : "bg-paper text-espresso"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
