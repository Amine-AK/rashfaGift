"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { stopOfferAction } from "@/app/[locale]/admin/actions";
import { useAdminAction } from "./form";

export function StopOfferButton({ id }: { id: string }) {
  const t = useTranslations("admin.offers");
  const { pending, run } = useAdminAction();
  return (
    <Button variant="danger" disabled={pending} onClick={() => confirm(t("stopConfirm")) && run(() => stopOfferAction(id))}>
      {t("stop")}
    </Button>
  );
}
