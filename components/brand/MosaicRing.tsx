import type { ReactNode } from "react";

const TILE_COLORS = [
  "var(--color-zellige-red)",
  "var(--color-zellige-blue)",
  "var(--color-plant)",
  "var(--color-zellige-yellow)",
  "var(--color-zellige-teal)",
  "var(--color-zellige-pink)",
];

type MosaicRingProps = {
  value: number;
  max: number;
  size?: number;
  tiles?: number;
  label: string;
  children?: ReactNode;
};

/**
 * Progress shown as a ring of zellige tiles, like the rim of the café tables.
 * Each step fills an equal arc of tiles in alternating colours.
 */
export function MosaicRing({ value, max, size = 168, tiles = 30, label, children }: MosaicRingProps) {
  const safeMax = Math.max(1, max);
  const ratio = Math.min(1, Math.max(0, value / safeMax));
  const filled = Math.round(ratio * tiles);
  const center = 100;
  const radius = 82;
  const tile = 14;

  return (
    <div
      className="relative inline-grid place-items-center"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={Math.min(value, safeMax)}
      aria-label={label}
    >
      <svg viewBox="0 0 200 200" width={size} height={size} className="absolute inset-0" aria-hidden>
        <circle cx={center} cy={center} r={radius + 12} fill="#fff" />
        {Array.from({ length: tiles }, (_, i) => {
          const angle = (i / tiles) * Math.PI * 2 - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          const isOn = i < filled;
          // Each step (point) gets its own colour so the ring reads as "segments".
          const step = Math.floor((i / tiles) * safeMax);
          return (
            <rect
              key={i}
              x={x - tile / 2}
              y={y - tile / 2}
              width={tile}
              height={tile}
              rx={2}
              transform={`rotate(${(angle * 180) / Math.PI + 90} ${x} ${y})`}
              fill={isOn ? TILE_COLORS[(step + i) % TILE_COLORS.length] : "#F1ECE3"}
              stroke={isOn ? "none" : "rgb(59 36 24 / 0.12)"}
              style={isOn ? { transition: "fill .4s", transitionDelay: `${i * 25}ms` } : undefined}
            />
          );
        })}
        {/* octagonal centre, like the white tiles */}
        <path
          d="M78 44h44l22 22v68l-22 22H78l-22-22V66z"
          transform="translate(0 0)"
          fill="var(--color-cream)"
          stroke="rgb(59 36 24 / 0.08)"
        />
      </svg>
      <div className="relative z-10 text-center">{children}</div>
    </div>
  );
}
