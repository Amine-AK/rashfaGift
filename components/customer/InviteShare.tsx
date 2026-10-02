"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, buttonClass } from "@/components/ui/Button";

export function InviteShare({ link, message }: { link: string; message: string }) {
  const t = useTranslations("invite");
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2">
      <Button
        size="lg"
        className="w-full"
        onClick={async () => {
          if (navigator.share) {
            await navigator.share({ text: message }).catch(() => {});
          } else {
            await navigator.clipboard.writeText(link);
            setCopied(true);
          }
        }}
      >
        {t("share")}
      </Button>
      <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "lg", "w-full")}>
        {t("whatsapp")}
      </a>
      <button
        type="button"
        className="min-h-12 text-sm text-wood-dark underline underline-offset-4"
        onClick={async () => {
          await navigator.clipboard.writeText(link);
          setCopied(true);
        }}
      >
        {copied ? t("copied") : t("copy")}
      </button>
    </div>
  );
}
