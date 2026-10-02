export type DoodleKind = "cup" | "iced" | "tea" | "shake" | "mojito" | "soda" | "frappe" | "juice" | "crepe";

const ink = { fill: "none", stroke: "var(--color-espresso)", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const drawings: Record<DoodleKind, React.ReactNode> = {
  cup: (
    <g {...ink}>
      <path d="M22 36h30v14a12 12 0 0 1-12 12h-6a12 12 0 0 1-12-12z" />
      <path d="M52 40h4a6 6 0 0 1 0 12h-5" />
      <path d="M18 66h40" />
      <path d="M32 20c-3 3 3 5 0 9M40 18c-3 3 3 5 0 9" />
    </g>
  ),
  iced: (
    <g {...ink}>
      <path d="M24 26h28l-4 40H28z" />
      <path d="M42 26l6-14h6" />
      <rect x="30" y="34" width="7" height="7" rx="1" />
      <rect x="39" y="42" width="7" height="7" rx="1" />
      <path d="M26 50h24" />
    </g>
  ),
  tea: (
    <g {...ink}>
      <path d="M28 30h20l-3 34H31z" />
      <path d="M29 42h18" />
      <path d="M44 28c4-6 10-6 12-2-4 1-6 2-8 6" />
      <path d="M36 22c-3 2 2 4 0 6" />
    </g>
  ),
  shake: (
    <g {...ink}>
      <path d="M26 30h24l-4 36H30z" />
      <path d="M24 30c0-8 6-10 14-10s14 2 14 10" />
      <circle cx="38" cy="16" r="3" />
      <path d="M44 22l6-14" />
    </g>
  ),
  mojito: (
    <g {...ink}>
      <path d="M25 24h26l-3 42H28z" />
      <path d="M30 44c3-4 7-4 8 0-3 1-6 2-8 0zM40 54c3-4 7-4 8 0-3 1-6 2-8 0z" />
      <path d="M44 24l-2-14" />
      <path d="M48 24a6 6 0 1 0-10-3" />
    </g>
  ),
  soda: (
    <g {...ink}>
      <path d="M30 22h16v6l3 6v30a3 3 0 0 1-3 3H30a3 3 0 0 1-3-3V34l3-6z" />
      <path d="M27 42h22M27 54h22" />
      <circle cx="38" cy="16" r="2" />
    </g>
  ),
  frappe: (
    <g {...ink}>
      <path d="M26 32h24l-4 34H30z" />
      <path d="M24 32c0-6 4-8 8-8 1-4 4-6 6-6s5 2 6 6c4 0 8 2 8 8" />
      <path d="M40 18l4-10" />
      <path d="M30 44l16 4M30 52l16 4" />
    </g>
  ),
  juice: (
    <g {...ink}>
      <path d="M26 26h24l-3 40H29z" />
      <circle cx="48" cy="24" r="7" />
      <path d="M44 20l8 8" />
      <path d="M28 38h20" />
    </g>
  ),
  crepe: (
    <g {...ink}>
      <ellipse cx="38" cy="54" rx="28" ry="9" />
      <path d="M16 50l22-26 22 26c-6 4-14 6-22 6s-16-2-22-6z" />
      <path d="M24 44q4 3 7 0t7 0 7 0 7 0" />
      <circle cx="34" cy="38" r="2.5" />
      <circle cx="43" cy="42" r="2.5" />
    </g>
  ),
};

/** A black line drawing of a drink on a soft green blob, as on the café menu boards. */
export function DrinkDoodle({ kind, size = 64, className }: { kind: DoodleKind; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 76 76" width={size} height={size} className={className} aria-hidden>
      <path
        d="M14 30c2-14 18-22 32-18s22 14 20 28-10 26-26 26S12 52 14 30z"
        fill="var(--color-blob)"
      />
      {drawings[kind]}
    </svg>
  );
}
