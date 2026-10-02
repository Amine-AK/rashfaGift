"use client";

import { useState } from "react";

const COLORS = ["#D9483B", "#1F4E9C", "#2F7D4F", "#E8B43A", "#2BA59B", "#E58FA6"];

type Piece = { left: number; size: number; delay: number; duration: number; drift: number; spin: number; color: string };

function makePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100,
    size: 7 + Math.random() * 9,
    delay: Math.random() * 0.8,
    duration: 2.2 + Math.random() * 1.8,
    drift: (Math.random() - 0.5) * 120,
    spin: 270 + Math.random() * 540,
    color: COLORS[i % COLORS.length],
  }));
}

/** Little square zellige tiles falling like confetti. Purely decorative. */
export function TileConfetti({ count = 46 }: { count?: number }) {
  // Lazy initialiser: generated once on the client, never during SSR.
  const [pieces] = useState(() => (typeof window === "undefined" ? [] : makePieces(count)));
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 rounded-[2px]"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              background: p.color,
              animation: `confetti-fall ${p.duration}s ${p.delay}s cubic-bezier(.2,.6,.4,1) forwards`,
              "--drift": `${p.drift}px`,
              "--spin": `${p.spin}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
