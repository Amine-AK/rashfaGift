import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export const inputClass =
  "w-full min-h-12 rounded-xl border-2 border-wood/50 bg-paper px-4 text-base text-espresso placeholder:text-wood-dark/60 focus:border-menu-green focus:outline-none";

export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-espresso">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-wood-dark">{hint}</span>}
    </label>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputClass} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${inputClass} ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputClass} py-3 ${className}`} {...props} />;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  const tones = {
    info: "bg-wood-light/40 text-espresso",
    error: "bg-zellige-red/10 text-[#9E2A20]",
    success: "bg-plant/15 text-menu-green-dark",
  };
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </p>
  );
}
