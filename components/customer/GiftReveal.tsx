"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Mascot } from "@/components/brand/Mascot";
import { TileConfetti } from "@/components/brand/TileConfetti";
import { Button } from "@/components/ui/Button";
import { revealGift } from "@/lib/actions/customer";
import { useRouter } from "@/i18n/navigation";

const BACKS = ["#D9483B", "#1F4E9C", "#2F7D4F", "#E8B43A", "#2BA59B", "#E58FA6", "#1F4E9C", "#E8B43A", "#D9483B"];

/** "Zellige tile flip": nine tiles turn over one by one to uncover the gift. */
export function GiftReveal({ giftId, title, tier, revealed }: { giftId: string; title: string; tier: string | null; revealed: boolean }) {
  const t = useTranslations("gifts");
  const [open, setOpen] = useState(revealed);
  const [celebrate, setCelebrate] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const reveal = () => {
    setOpen(true);
    setCelebrate(true);
    navigator.vibrate?.([30, 40, 60]);
    startTransition(async () => {
      await revealGift(giftId);
      router.refresh();
    });
  };

  if (!open) {
    return (
      <div className="text-center">
        <div className="mx-auto grid w-64 grid-cols-3 gap-1.5 rounded-3xl bg-white p-2 shadow-[var(--shadow-soft)]" aria-hidden>
          {BACKS.map((c, i) => (
            <div key={i} className="aspect-square rounded-lg" style={{ background: c, clipPath: i === 4 ? "polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)" : undefined }} />
          ))}
        </div>
        <p className="mt-5 font-hand text-2xl text-wood-dark">{t("mysteryTeaser")}</p>
        <Button variant="gift" size="lg" className="mt-4 w-full max-w-xs" onClick={reveal}>
          {t("reveal")}
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center">
      {celebrate && <TileConfetti />}
      <div className="relative mx-auto grid w-64 grid-cols-3 gap-1.5 rounded-3xl bg-white p-2 shadow-[var(--shadow-soft)]">
        {BACKS.map((_, i) => (
          <div
            key={i}
            className={`aspect-square rounded-lg bg-cream ${celebrate ? "animate-flip" : ""}`}
            style={{ animationDelay: celebrate ? `${[4, 1, 3, 5, 7, 0, 2, 6, 8].indexOf(i) * 90}ms` : undefined }}
          />
        ))}
        <div className={`absolute inset-0 grid place-items-center ${celebrate ? "animate-rise [animation-delay:900ms]" : ""}`}>
          <Mascot size={150} mood="happy" />
        </div>
      </div>
      <p className={`mt-5 font-hand text-2xl text-wood-dark ${celebrate ? "animate-rise [animation-delay:1100ms]" : ""}`}>{t("revealLine")}</p>
      <h2 className={`mt-1 font-serif text-3xl font-bold text-menu-green ${celebrate ? "animate-rise [animation-delay:1250ms]" : ""}`}>{title}</h2>
      {tier === "rare" && <p className="mt-2 inline-block rounded-full bg-zellige-yellow/30 px-3 py-1 text-sm font-bold">{t("rare")}</p>}
    </div>
  );
}
