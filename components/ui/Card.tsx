import type { HTMLAttributes, ReactNode } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-[var(--radius-card)] bg-paper p-5 shadow-[var(--shadow-soft)] ${className}`} {...props} />;
}

/** A card wrapped in the zellige rim, for the moments that matter (QR, gifts). */
export function ZelligeCard({ className = "", innerClassName = "", children }: { className?: string; innerClassName?: string; children: ReactNode }) {
  return (
    <div className={`zellige-frame ${className}`}>
      <div className={`zellige-inner p-5 ${innerClassName}`}>{children}</div>
    </div>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-3">
      <h2 className="font-serif text-xl font-bold text-menu-green">{children}</h2>
      {hint && <p className="mt-0.5 text-sm text-wood-dark">{hint}</p>}
    </div>
  );
}
