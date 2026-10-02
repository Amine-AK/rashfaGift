import { useTranslations } from "next-intl";
import type { Level } from "@/lib/rules/levels";

const styles: Record<Level, string> = {
  newcomer: "bg-zellige-teal/15 text-[#14665F] ring-zellige-teal/40",
  regular: "bg-zellige-blue/10 text-zellige-blue ring-zellige-blue/30",
  family: "bg-zellige-yellow/25 text-espresso ring-zellige-yellow",
};

export function LevelBadge({ level }: { level: Level }) {
  const t = useTranslations("levels");
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ring-2 ${styles[level]}`}>
      <span className="size-2.5 rotate-45 rounded-[2px] bg-current" aria-hidden />
      {t(level)}
    </span>
  );
}
