"use client";

import { useCallback, useState, useTransition } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { tr } from "@/lib/i18n-text";
import type { ScanSummary, VisitResult } from "@/lib/services/loyalty";
import { lookupScan, recordVisit, redeemFlash, redeemGift } from "@/app/[locale]/staff/actions";
import { QrCamera } from "./QrCamera";
import { feedback } from "./feedback";

type Flash = { tone: "success" | "error"; title: string; body?: string } | null;

export function StaffScanner() {
  const t = useTranslations("staff");
  const tl = useTranslations("levels");
  const format = useFormatter();
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [ticket, setTicket] = useState<string | null>(null);
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [scannedGift, setScannedGift] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [flash, setFlash] = useState<Flash>(null);

  const show = useCallback((f: NonNullable<Flash>) => {
    feedback(f.tone);
    setFlash(f);
    setTimeout(() => setFlash((cur) => (cur === f ? null : cur)), f.tone === "success" ? 2600 : 3600);
  }, []);

  const reset = () => {
    setTicket(null);
    setSummary(null);
    setScannedGift(null);
    setAmount("");
  };

  const errorText = (code: string, detail?: string) =>
    t.has(`errors.${code}${detail ? `_${detail}` : ""}`) ? t(`errors.${code}${detail ? `_${detail}` : ""}`) : t.has(`errors.${code}`) ? t(`errors.${code}`) : t("errors.generic");

  const onScan = useCallback(
    (text: string) => {
      feedback("scan");
      startTransition(async () => {
        const res = await lookupScan(text);
        if (!res.ok) {
          if (res.error === "unauthenticated") return location.reload();
          return show({ tone: "error", title: errorText(res.error) });
        }
        setTicket(res.ticket);
        setSummary(res.summary);
        setScannedGift(res.giftId);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [show],
  );

  const handleVisit = (choice: "discount" | "save") =>
    startTransition(async () => {
      if (!ticket) return;
      const res = await recordVisit(ticket, Number(amount.replace(",", ".")), choice);
      if (!res.ok) return show({ tone: "error", title: errorText(res.error, res.detail) });
      setSummary(res.summary);
      const r: VisitResult = res.result;
      if (!r.counted) {
        return show({
          tone: "error",
          title: t("visitNotCounted"),
          body:
            r.reason === "below_min"
              ? t("belowMin", { min: r.minAmount })
              : t("cooldown", { time: format.dateTime(new Date(r.nextEligibleAt), { hour: "2-digit", minute: "2-digit" }) }),
        });
      }
      setAmount("");
      show({
        tone: "success",
        title: r.choice === "discount" ? t("discountApplied", { percent: r.discountPercent }) : t("pointSaved", { points: r.points, total: r.pointsForGift }),
        body: [
          r.giftsUnlocked.length ? t("giftUnlocked") : null,
          r.levelUp ? t("levelUp", { level: tl(r.level) }) : null,
          r.referralBonus ? t("referralBonus") : null,
        ]
          .filter(Boolean)
          .join(" · "),
      });
    });

  const handleGift = (giftId: string) =>
    startTransition(async () => {
      if (!ticket) return;
      const res = await redeemGift(ticket, giftId);
      if (!res.ok) return show({ tone: "error", title: errorText(res.error, res.detail) });
      setSummary(res.summary);
      setScannedGift(null);
      show({ tone: "success", title: t("giftGiven"), body: tr(res.result.title, locale) });
    });

  const handleFlash = (offerId: string) =>
    startTransition(async () => {
      if (!ticket) return;
      const res = await redeemFlash(ticket, offerId);
      if (!res.ok) return show({ tone: "error", title: errorText(res.error, res.detail) });
      setSummary(res.summary);
      show({ tone: "success", title: t("flashGiven"), body: `${tr(res.result.reward, locale)} · ${t("left", { count: res.result.left })}` });
    });

  const amountValue = Number(amount.replace(",", "."));
  const amountOk = amount !== "" && amountValue >= (summary?.rules.minOrderAmount ?? 0);

  return (
    <div className="space-y-4">
      {flash && (
        <div
          role="alert"
          data-testid="feedback"
          className={`fixed inset-x-0 top-0 z-50 px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))] text-center text-white shadow-lg ${
            flash.tone === "success" ? "bg-menu-green" : "bg-zellige-red"
          }`}
          onClick={() => setFlash(null)}
        >
          <p className="text-2xl font-extrabold">{flash.tone === "success" ? "✓ " : "✕ "}{flash.title}</p>
          {flash.body && <p className="mt-1 text-lg">{flash.body}</p>}
        </div>
      )}

      {!summary ? (
        <>
          <QrCamera onResult={onScan} paused={pending} labels={{ denied: t("cameraDenied"), starting: t("cameraStarting") }} />
          <p className="text-center text-lg text-wood-dark">{pending ? t("checking") : t("scanHint")}</p>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-3xl bg-paper p-5 shadow-[var(--shadow-soft)]">
            <div>
              <p className="text-3xl font-extrabold">{summary.customer.firstName}</p>
              <p className="mt-1 text-lg text-wood-dark">
                {tl(summary.customer.level)} · {t("visits", { count: summary.customer.visitCount })} ·{" "}
                {t("pointsShort", { points: summary.customer.points, total: summary.rules.pointsForGift })}
              </p>
            </div>
            <Button variant="secondary" onClick={reset}>
              {t("next")}
            </Button>
          </div>

          {summary.visit.eligible ? (
            <section className="space-y-3 rounded-3xl bg-paper p-5 shadow-[var(--shadow-soft)]">
              <label className="block">
                <span className="text-lg font-bold">{t("amount")}</span>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    inputMode="decimal"
                    dir="ltr"
                    className="!min-h-16 text-center !text-3xl font-bold"
                    value={amount}
                    autoFocus
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
                  />
                  <span className="text-2xl font-bold text-wood-dark">DH</span>
                </div>
                {amount !== "" && !amountOk && (
                  <span className="mt-1 block text-[#9E2A20]">{t("belowMin", { min: summary.rules.minOrderAmount })}</span>
                )}
              </label>
              {summary.customer.preferredChoice && (
                <p className="rounded-xl bg-zellige-yellow/25 px-3 py-2 text-center font-bold">
                  {t(summary.customer.preferredChoice === "save" ? "prefersSave" : "prefersDiscount")}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  size="xl"
                  variant={summary.customer.preferredChoice === "discount" ? "primary" : "secondary"}
                  disabled={pending || !amountOk}
                  onClick={() => handleVisit("discount")}
                >
                  {t("discountNow", { percent: summary.rules.instantDiscountPercent })}
                </Button>
                <Button
                  size="xl"
                  variant={summary.customer.preferredChoice === "discount" ? "secondary" : "primary"}
                  disabled={pending || !amountOk}
                  onClick={() => handleVisit("save")}
                >
                  {t("savePoint")}
                </Button>
              </div>
            </section>
          ) : (
            <p className="rounded-3xl bg-wood-light/50 p-5 text-center text-lg">
              {t("alreadyCounted", { time: format.dateTime(new Date(summary.visit.nextEligibleAt), { hour: "2-digit", minute: "2-digit" }) })}
            </p>
          )}

          {summary.gifts.length > 0 && (
            <section className="space-y-3 rounded-3xl bg-paper p-5 shadow-[var(--shadow-soft)]">
              <h2 className="text-xl font-extrabold">{t("gifts")}</h2>
              {summary.gifts.map((g) => (
                <div
                  key={g.id}
                  className={`flex items-center justify-between gap-3 rounded-2xl p-3 ${g.id === scannedGift ? "bg-zellige-yellow/30 ring-2 ring-zellige-yellow" : "bg-cream"}`}
                >
                  <div>
                    <p className="text-lg font-bold">{tr(g.title, locale)}</p>
                    <p className="text-sm text-wood-dark">
                      {g.status === "locked"
                        ? t("giftLocked", { date: format.dateTime(new Date(g.availableFrom), { weekday: "long", day: "numeric", month: "short" }) })
                        : g.status === "used_today"
                          ? t("giftUsedToday")
                          : g.usesLeft > 1
                            ? t("usesLeft", { count: g.usesLeft })
                            : t("giftExpires", { date: format.dateTime(new Date(new Date(g.expiresAt).getTime() - 1), { day: "numeric", month: "short" }) })}
                    </p>
                  </div>
                  {g.status === "available" && (
                    <Button variant="gift" size="lg" disabled={pending} onClick={() => handleGift(g.id)}>
                      {t("claimGift")}
                    </Button>
                  )}
                </div>
              ))}
            </section>
          )}

          {summary.offers.length > 0 && (
            <section className="space-y-3 rounded-3xl bg-paper p-5 shadow-[var(--shadow-soft)]">
              <h2 className="text-xl font-extrabold">{t("flashOffers")}</h2>
              {summary.offers.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 rounded-2xl bg-zellige-red/10 p-3">
                  <div>
                    <p className="text-lg font-bold">{tr(o.title, locale)}</p>
                    <p className="text-sm">
                      {tr(o.reward, locale)} · {t("left", { count: Math.max(0, o.maxQty - o.claimedQty) })}
                    </p>
                  </div>
                  {o.claimedByMe ? (
                    <span className="font-bold text-menu-green">{t("alreadyClaimed")}</span>
                  ) : o.state === "live" ? (
                    <Button variant="flash" size="lg" disabled={pending} onClick={() => handleFlash(o.id)}>
                      {t("claimFlash")}
                    </Button>
                  ) : (
                    <span className="font-bold text-wood-dark">{t("soldOut")}</span>
                  )}
                </div>
              ))}
            </section>
          )}

          <Button size="lg" variant="secondary" className="w-full" onClick={reset}>
            {t("scanNext")}
          </Button>
        </div>
      )}
    </div>
  );
}
