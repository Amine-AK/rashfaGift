"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { DrinkDoodle } from "@/components/brand/DrinkDoodle";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Counter = { claimedQty: number; maxQty: number; endsAt: string | Date; stoppedAt: string | Date | null };

export type FlashCardOffer = Counter & {
  id: string;
  title: string;
  reward: string;
  startsAt: string | Date;
  claimedByMe: boolean;
};

function useCountdown(target: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = Math.max(0, target - now);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return { ms, label: `${h > 0 ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` };
}

/** A quiet-hours offer with a gentle countdown and a live "x of N left" counter. */
export function FlashOfferCard({ offer }: { offer: FlashCardOffer }) {
  const t = useTranslations("flash");
  const [counter, setCounter] = useState<Counter>(offer);
  const startsAt = new Date(offer.startsAt).getTime();
  const endsAt = new Date(counter.endsAt).getTime();
  const notStarted = useCountdown(startsAt).ms > 0;
  const countdown = useCountdown(notStarted ? startsAt : endsAt);

  useEffect(() => {
    const supabase = supabaseBrowser();
    if (supabase) {
      const channel = supabase
        .channel(`flash-${offer.id}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "flash_offers", filter: `id=eq.${offer.id}` }, (payload) => {
          const row = payload.new as { claimed_qty: number; max_qty: number; ends_at: string; stopped_at: string | null };
          setCounter({ claimedQty: row.claimed_qty, maxQty: row.max_qty, endsAt: row.ends_at, stoppedAt: row.stopped_at });
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
    // No Realtime configured: poll gently.
    const poll = async () => {
      const res = await fetch(`/api/flash?ids=${offer.id}`, { cache: "no-store" }).catch(() => null);
      const [row] = res?.ok ? await res.json() : [];
      if (row) setCounter(row);
    };
    const id = setInterval(poll, 15_000);
    return () => clearInterval(id);
  }, [offer.id]);

  const left = Math.max(0, counter.maxQty - counter.claimedQty);
  const over = !!counter.stoppedAt || (!notStarted && countdown.ms === 0);
  if (over) return null;

  return (
    <article className="relative overflow-hidden rounded-[var(--radius-card)] border-2 border-zellige-red/30 bg-paper p-5 shadow-[var(--shadow-soft)]">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-[repeating-linear-gradient(90deg,var(--color-zellige-red)_0_10px,var(--color-zellige-yellow)_10px_20px,var(--color-zellige-blue)_20px_30px,var(--color-zellige-teal)_30px_40px)]" />
      <div className="flex items-start gap-3">
        <DrinkDoodle kind="iced" size={56} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-zellige-red-ink">{notStarted ? t("soon") : t("now")}</p>
          <h3 className="font-serif text-xl font-bold leading-tight">{offer.title}</h3>
          <p className="mt-1">{offer.reward}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-cream px-4 py-3">
        <p className="text-sm">
          {notStarted ? t("startsIn") : t("endsIn")}{" "}
          <span className="font-mono text-lg font-bold tabular-nums" dir="ltr">
            {countdown.label}
          </span>
        </p>
        <p className="text-sm font-bold" aria-live="polite">
          {offer.claimedByMe ? t("yours") : left === 0 ? t("allGone") : t("left", { left, total: counter.maxQty })}
        </p>
      </div>
      {!offer.claimedByMe && left > 0 && !notStarted && <p className="mt-2 text-sm text-wood-dark">{t("howTo")}</p>}
    </article>
  );
}
