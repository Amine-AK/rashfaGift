"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Notice } from "@/components/ui/Field";
import { ZelligeCard } from "@/components/ui/Card";
import { completeSignup, requestCode, verifyCode } from "./actions";

type Step = "phone" | "code" | "profile";

export function JoinFlow({ referralCode }: { referralCode: string | null }) {
  const t = useTranslations("join");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [ticket, setTicket] = useState("");
  const [firstName, setFirstName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const send = () =>
    startTransition(async () => {
      setError(null);
      const res = await requestCode(phoneInput, locale);
      if (!res.ok) return setError(res.error);
      setPhone(res.phone);
      setDevCode(res.devCode ?? null);
      setCode("");
      setStep("code");
      setResendIn(30);
    });

  const verify = () =>
    startTransition(async () => {
      setError(null);
      const res = await verifyCode(phone, code);
      if (!res.ok) return setError(res.error);
      if (res.next === "home") return router.replace("/home");
      setTicket(res.ticket);
      setStep("profile");
    });

  const create = () =>
    startTransition(async () => {
      setError(null);
      const res = await completeSignup({
        ticket,
        firstName,
        birthday: birthday || null,
        consent: consent as true,
        referralCode,
        locale: locale as "fr" | "ar" | "en",
      });
      if (!res.ok) return setError(res.error);
      router.replace(res.next === "welcome" ? "/welcome" : "/home");
    });

  return (
    <ZelligeCard className="mt-6" innerClassName="space-y-5">
      <ol className="flex justify-center gap-2" aria-label={t("progress")}>
        {(["phone", "code", "profile"] as const).map((s, i) => (
          <li
            key={s}
            aria-current={s === step ? "step" : undefined}
            className={`h-2.5 w-10 rounded-full ${["phone", "code", "profile"].indexOf(step) >= i ? "bg-menu-green" : "bg-wood-light"}`}
          />
        ))}
      </ol>

      {step === "phone" && (
        <form className="space-y-4" onSubmit={(e) => (e.preventDefault(), send())}>
          <Field label={t("phoneLabel")} hint={t("phoneHint")}>
            <Input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              required
              placeholder="06 12 34 56 78"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
            />
          </Field>
          {referralCode && <Notice tone="success">{t("referredBy")}</Notice>}
          {error && <Notice tone="error">{t(`errors.${error}`)}</Notice>}
          <Button type="submit" size="lg" className="w-full" disabled={pending || !phoneInput}>
            {pending ? t("sending") : t("sendCode")}
          </Button>
        </form>
      )}

      {step === "code" && (
        <form className="space-y-4" onSubmit={(e) => (e.preventDefault(), verify())}>
          <p className="text-center">
            {t("codeSent")} <bdi dir="ltr" className="font-bold">{phone}</bdi>
          </p>
          {devCode && (
            <Notice>
              {t("devCode")} <strong dir="ltr" className="font-mono text-lg tracking-widest">{devCode}</strong>
            </Notice>
          )}
          <Field label={t("codeLabel")}>
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              dir="ltr"
              required
              autoFocus
              className="text-center font-mono text-2xl tracking-[0.5em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </Field>
          {error && <Notice tone="error">{t(`errors.${error}`)}</Notice>}
          <Button type="submit" size="lg" className="w-full" disabled={pending || code.length !== 6}>
            {pending ? t("checking") : t("verify")}
          </Button>
          <div className="flex justify-between text-sm">
            <button type="button" className="min-h-12 text-wood-dark underline-offset-4 hover:underline" onClick={() => setStep("phone")}>
              {t("changeNumber")}
            </button>
            <button
              type="button"
              className="min-h-12 text-wood-dark underline-offset-4 hover:underline disabled:opacity-50"
              disabled={resendIn > 0 || pending}
              onClick={send}
            >
              {resendIn > 0 ? t("resendIn", { seconds: resendIn }) : t("resend")}
            </button>
          </div>
        </form>
      )}

      {step === "profile" && (
        <form className="space-y-4" onSubmit={(e) => (e.preventDefault(), create())}>
          <Field label={t("nameLabel")}>
            <Input autoComplete="given-name" required maxLength={40} autoFocus value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Field>
          <Field label={t("birthdayLabel")} hint={t("birthdayHint")}>
            <Input type="date" value={birthday} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setBirthday(e.target.value)} />
          </Field>
          <label className="flex min-h-12 items-start gap-3 rounded-xl bg-cream p-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-5 shrink-0 accent-menu-green"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
            />
            <span>
              {t("consent")}{" "}
              <Link href="/privacy" target="_blank" className="font-bold text-menu-green underline underline-offset-2">
                {t("privacyLink")}
              </Link>
            </span>
          </label>
          {error && <Notice tone="error">{t(`errors.${error}`)}</Notice>}
          <Button type="submit" size="lg" className="w-full" disabled={pending || !firstName.trim() || !consent}>
            {pending ? t("creating") : t("create")}
          </Button>
        </form>
      )}
    </ZelligeCard>
  );
}
