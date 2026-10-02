import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "flash" | "gift" | "danger";
type Size = "md" | "lg" | "xl";

const variants: Record<Variant, string> = {
  primary: "bg-menu-green text-white hover:bg-menu-green-dark disabled:bg-menu-green/50",
  secondary: "bg-paper text-espresso border-2 border-wood hover:bg-wood-light/40 disabled:opacity-50",
  ghost: "bg-transparent text-wood-dark hover:bg-wood-light/40 disabled:opacity-50",
  flash: "bg-zellige-red-ink text-white hover:brightness-95 disabled:opacity-50",
  gift: "bg-zellige-yellow text-espresso hover:brightness-95 disabled:opacity-50",
  danger: "bg-paper text-zellige-red-ink border-2 border-zellige-red/60 hover:bg-zellige-red/5 disabled:opacity-50",
};

const sizes: Record<Size, string> = {
  md: "min-h-12 px-5 text-base",
  lg: "min-h-14 px-6 text-lg",
  xl: "min-h-20 px-6 text-xl",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition active:scale-[.98] disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${extra}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export function Button({ variant = "primary", size = "md", className = "", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}
