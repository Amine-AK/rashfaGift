"use client";

import { useRouter } from "@/i18n/navigation";
import { logoutStaff } from "@/app/[locale]/staff/actions";

export function LogoutButton({ label }: { label: string }) {
  const router = useRouter();
  return (
    <button
      className="min-h-12 px-4 text-wood-dark underline underline-offset-4"
      onClick={async () => {
        await logoutStaff();
        router.replace("/staff/login");
      }}
    >
      {label}
    </button>
  );
}
