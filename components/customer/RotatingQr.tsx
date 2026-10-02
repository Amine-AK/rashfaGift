"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Qr = { svg: string; expiresAt: number };

/**
 * The personal code: fetched from the server and refreshed every minute, so a
 * screenshot is useless. Tap to show it full screen (and keep the screen awake).
 */
export function RotatingQr({ giftId, size = 232 }: { giftId?: string; size?: number }) {
  const t = useTranslations("home");
  const [qr, setQr] = useState<Qr | null>(null);
  const [failed, setFailed] = useState(false);
  const [big, setBig] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    const load = async () => {
      clearTimeout(timer);
      try {
        const res = await fetch(`/api/qr${giftId ? `?gift=${giftId}` : ""}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data: Qr = await res.json();
        if (!alive) return;
        setQr(data);
        setFailed(false);
        timer = setTimeout(load, Math.max(2_000, data.expiresAt - Date.now() + 300));
      } catch {
        if (!alive) return;
        setFailed(true);
        timer = setTimeout(load, 5_000);
      }
    };
    load();
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive = false;
      clearTimeout(timer);
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [giftId]);

  useEffect(() => {
    if (!big) return;
    let lock: WakeLockSentinel | undefined;
    navigator.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setBig(false);
    window.addEventListener("keydown", onKey);
    return () => {
      lock?.release().catch(() => {});
      window.removeEventListener("keydown", onKey);
    };
  }, [big]);

  const secondsLeft = qr ? Math.max(0, Math.ceil((qr.expiresAt - now) / 1000)) : 0;
  const code = qr ? (
    <div className="[&>svg]:size-full" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: qr.svg }} />
  ) : (
    <div className="grid animate-pulse place-items-center rounded-xl bg-cream text-wood-dark" style={{ width: size, height: size }}>
      {failed ? t("qrOffline") : ""}
    </div>
  );

  return (
    <>
      <button type="button" onClick={() => setBig(true)} className="mx-auto block rounded-2xl bg-white p-2" aria-label={t("qrEnlarge")}>
        {code}
      </button>
      <div className="mx-auto mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-wood-light" aria-hidden>
        <div className="h-full rounded-full bg-plant transition-[width] duration-1000 ease-linear" style={{ width: `${(secondsLeft / 60) * 100}%` }} />
      </div>
      <p className="mt-1 text-center text-xs text-wood-dark">{t("qrRotates")}</p>

      {big && (
        <div role="dialog" aria-modal className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-white p-6" onClick={() => setBig(false)}>
          <div style={{ width: "min(88vw, 420px)", aspectRatio: "1" }} className="[&>div]:!size-full">
            {code}
          </div>
          <p className="max-w-xs text-center text-lg">{t("qrBrightness")}</p>
          <button className="min-h-12 rounded-2xl border-2 border-wood px-6 font-bold">{t("qrClose")}</button>
        </div>
      )}
    </>
  );
}
