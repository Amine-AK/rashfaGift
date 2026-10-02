"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

/** Shares a story-sized image (Instagram / WhatsApp) of the gift, or downloads it. */
export function ShareGift({ giftId }: { giftId: string }) {
  const t = useTranslations("gifts");
  const locale = useLocale();
  const [busy, setBusy] = useState(false);

  async function share() {
    setBusy(true);
    try {
      const url = `/api/share/${giftId}?locale=${locale}`;
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], "rashfa-gift.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: t("shareText") });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "rashfa-gift.png";
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch {
      // The customer closed the share sheet: nothing to do.
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="secondary" size="lg" className="w-full" onClick={share} disabled={busy}>
      {t("share")}
    </Button>
  );
}
