"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { savePushSubscription } from "@/lib/actions/push";
import { isIos, isStandalone, pushSupported, urlBase64ToUint8Array } from "./device";

type State = "checking" | "unsupported" | "ios-install-first" | "ask" | "denied" | "on";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/**
 * Explains, in the café's voice, what notifications are for before asking.
 * The browser prompt only appears after the customer taps "Yes".
 */
export function NotifyPrompt({ onDone, compact = false }: { onDone?: () => void; compact?: boolean }) {
  const t = useTranslations("notify");
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!VAPID) return setState("unsupported");
      if (!pushSupported()) return setState(isIos() && !isStandalone() ? "ios-install-first" : "unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub && Notification.permission === "granted") {
        // Keep the server copy fresh (subscriptions can rotate).
        await savePushSubscription(sub.toJSON());
        return setState("on");
      }
      setState("ask");
    })().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "denied" : "ask");
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID) }));
      const res = await savePushSubscription(sub.toJSON());
      setState(res.ok ? "on" : "ask");
      if (res.ok) onDone?.();
    } finally {
      setBusy(false);
    }
  }

  if (state === "checking" || (compact && (state === "on" || state === "unsupported"))) return null;

  return (
    <div className="space-y-3">
      {!compact && <p>{t("why")}</p>}
      <ul className="space-y-1 text-sm text-wood-dark">
        <li>· {t("promise1")}</li>
        <li>· {t("promise2")}</li>
      </ul>
      {state === "ask" && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button size="lg" className="flex-1" onClick={enable} disabled={busy}>
            {t("yes")}
          </Button>
          {onDone && (
            <Button variant="ghost" size="lg" onClick={onDone}>
              {t("later")}
            </Button>
          )}
        </div>
      )}
      {state === "on" && <p className="rounded-xl bg-plant/15 px-4 py-3 text-menu-green-dark">{t("on")}</p>}
      {state === "denied" && <p className="rounded-xl bg-wood-light/40 px-4 py-3">{t("denied")}</p>}
      {state === "ios-install-first" && <p className="rounded-xl bg-wood-light/40 px-4 py-3">{t("iosInstallFirst")}</p>}
      {state === "unsupported" && <p className="rounded-xl bg-wood-light/40 px-4 py-3">{t("unsupported")}</p>}
    </div>
  );
}
