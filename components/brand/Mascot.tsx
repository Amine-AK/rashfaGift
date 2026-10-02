type MascotProps = {
  size?: number;
  /** Sleepy (eyes closed) is the default mood from the café sticker. */
  mood?: "sleepy" | "happy";
  steam?: boolean;
  className?: string;
  title?: string;
};

/**
 * Rashfa's little mascot: a round, sleepy-happy face holding a cup.
 * Original line art inspired by the sticker on the espresso machine.
 */
export function Mascot({ size = 96, mood = "sleepy", steam = true, className, title }: MascotProps) {
  const ink = "var(--color-espresso)";
  return (
    <svg
      viewBox="0 0 120 124"
      width={size}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {steam && (
        <g fill="none" stroke={ink} strokeWidth="2.5" strokeLinecap="round" opacity="0.7">
          <path className="animate-steam" d="M52 12c-4 4 4 6 0 10" />
          <path className="animate-steam [animation-delay:400ms]" d="M60 8c-4 4 4 6 0 10" />
          <path className="animate-steam [animation-delay:800ms]" d="M68 12c-4 4 4 6 0 10" />
        </g>
      )}
      <circle cx="60" cy="58" r="34" fill="#fff" stroke={ink} strokeWidth="3" />
      {mood === "sleepy" ? (
        <g fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round">
          <path d="M42 54q6 6 12 0" />
          <path d="M66 54q6 6 12 0" />
        </g>
      ) : (
        <g fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round">
          <path d="M42 56q6-7 12 0" />
          <path d="M66 56q6-7 12 0" />
        </g>
      )}
      <ellipse cx="40" cy="66" rx="5" ry="3" fill="var(--color-zellige-pink)" opacity="0.55" />
      <ellipse cx="80" cy="66" rx="5" ry="3" fill="var(--color-zellige-pink)" opacity="0.55" />
      <path d="M54 68q6 5 12 0" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      {/* the cup, held under the chin */}
      <path
        d="M33 84h54l-4 24a8 8 0 0 1-8 7H45a8 8 0 0 1-8-7z"
        fill="var(--color-wood-light)"
        stroke={ink}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M87 89h3a7 7 0 0 1 0 14h-5" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M40 94h40" stroke={ink} strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      {/* little hands */}
      <circle cx="35" cy="99" r="5" fill="#fff" stroke={ink} strokeWidth="2.5" />
      <circle cx="62" cy="86" r="5" fill="#fff" stroke={ink} strokeWidth="2.5" />
    </svg>
  );
}
