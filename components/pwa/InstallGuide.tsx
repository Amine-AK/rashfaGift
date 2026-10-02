"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { isIos, isStandalone } from "./device";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const noop = () => () => {};

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" className="inline align-text-bottom" aria-hidden>
      <path d="M12 3v12M7 8l5-5 5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** "Add to Home Screen" with clear steps for iPhone and Android. Hidden once installed. */
export function InstallGuide() {
  const t = useTranslations("install");
  const standalone = useSyncExternalStore(noop, isStandalone, () => false);
  const ios = useSyncExternalStore(noop, isIos, () => false);
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as InstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone || installed) {
    return <p className="rounded-xl bg-plant/15 px-4 py-3 text-menu-green-dark">{t("installed")}</p>;
  }

  return (
    <div className="space-y-3">
      <p>{t("why")}</p>
      {promptEvent ? (
        <Button
          size="lg"
          className="w-full"
          onClick={async () => {
            await promptEvent.prompt();
            const { outcome } = await promptEvent.userChoice;
            if (outcome === "accepted") setInstalled(true);
            setPromptEvent(null);
          }}
        >
          {t("installButton")}
        </Button>
      ) : ios ? (
        <ol className="space-y-2 rounded-xl bg-cream p-4">
          <li>1. {t.rich("iosStep1", { icon: () => <ShareIcon /> })}</li>
          <li>2. {t("iosStep2")}</li>
          <li>3. {t("iosStep3")}</li>
        </ol>
      ) : (
        <ol className="space-y-2 rounded-xl bg-cream p-4">
          <li>1. {t("androidStep1")}</li>
          <li>2. {t("androidStep2")}</li>
        </ol>
      )}
    </div>
  );
}
