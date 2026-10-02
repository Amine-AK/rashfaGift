"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { deleteMyAccount, logout } from "@/lib/actions/customer";

export function AccountActions() {
  const t = useTranslations("settings");
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-5 space-y-3 border-t border-dotted border-espresso/30 pt-5">
      <Button
        variant="secondary"
        className="w-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await logout();
            router.replace("/");
          })
        }
      >
        {t("logout")}
      </Button>
      {!confirming ? (
        <Button variant="danger" className="w-full" onClick={() => setConfirming(true)}>
          {t("delete")}
        </Button>
      ) : (
        <div className="space-y-3 rounded-2xl bg-zellige-red/5 p-4">
          <p>{t("deleteConfirm")}</p>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setConfirming(false)}>
              {t("keep")}
            </Button>
            <Button
              variant="flash"
              className="flex-1"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await deleteMyAccount();
                  router.replace("/");
                })
              }
            >
              {t("deleteForever")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
