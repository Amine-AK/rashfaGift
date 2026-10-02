/** Hanging woven straw lampshade with a fringe, like the ones in the café. */
export function LampShade({ size = 44, className, swing = true }: { size?: number; className?: string; swing?: boolean }) {
  return (
    <svg
      viewBox="0 0 80 100"
      width={size}
      height={(size * 100) / 80}
      className={`${swing ? "animate-sway" : ""} origin-top ${className ?? ""}`}
      aria-hidden
    >
      <line x1="40" y1="0" x2="40" y2="28" stroke="var(--color-espresso)" strokeWidth="2" />
      <path d="M22 44q18-20 36 0l10 26H12z" fill="#E7C796" stroke="var(--color-wood-dark)" strokeWidth="2" />
      <g stroke="var(--color-wood-dark)" strokeWidth="1.2" opacity="0.55">
        <path d="M18 56h44M15 63h50M24 48h32" />
        <path d="M30 40l-6 30M40 34v36M50 40l6 30" />
      </g>
      <g stroke="#C9995E" strokeWidth="2" strokeLinecap="round">
        {Array.from({ length: 15 }, (_, i) => {
          const x = 14 + i * 3.7;
          return <line key={i} x1={x} y1="71" x2={x + (i % 2 ? 1 : -1)} y2={84 + (i % 3) * 2} />;
        })}
      </g>
      <ellipse cx="40" cy="74" rx="8" ry="3" fill="#FFE7A8" opacity="0.8" />
    </svg>
  );
}
