"use client";

import { useState, type ReactNode } from "react";
import { CHART } from "./chart-colors";

type Tip = { x: number; y: number; value: string; label: string } | null;

function useTip() {
  const [tip, setTip] = useState<Tip>(null);
  const bind = (value: string, label: string) => ({
    tabIndex: 0,
    "aria-label": `${label}: ${value}`,
    onPointerEnter: (e: React.PointerEvent) => setTip({ x: e.clientX, y: e.clientY, value, label }),
    onPointerMove: (e: React.PointerEvent) => setTip({ x: e.clientX, y: e.clientY, value, label }),
    onPointerLeave: () => setTip(null),
    onFocus: (e: React.FocusEvent<HTMLElement | SVGElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      setTip({ x: r.left + r.width / 2, y: r.top, value, label });
    },
    onBlur: () => setTip(null),
  });
  const node = tip && (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg bg-espresso px-3 py-2 text-white shadow-lg"
      style={{ left: tip.x, top: tip.y }}
    >
      <p className="text-base font-bold tabular-nums">{tip.value}</p>
      <p className="text-xs text-white/80">{tip.label}</p>
    </div>
  );
  return { bind, node };
}

function TableView({ summary, head, rows }: { summary: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-wood-dark">{summary}</summary>
      <table className="mt-2 w-full text-start">
        <thead>
          <tr>{head.map((h) => <th key={h} className="py-1 text-start font-bold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-wood/15">
              {r.map((c, j) => <td key={j} className="py-1 tabular-nums">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/** Single-series column chart (e.g. new customers per week). */
export function ColumnChart({ data, valueLabel, tableLabel }: { data: { label: string; value: number }[]; valueLabel: string; tableLabel: string }) {
  const { bind, node } = useTip();
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div className="flex h-40 items-end gap-1.5 border-b border-espresso/20" dir="ltr">
        {data.map((d) => (
          <div key={d.label} className="group flex h-full flex-1 flex-col items-center justify-end outline-none" {...bind(String(d.value), `${valueLabel} · ${d.label}`)}>
            <span className="mb-1 text-xs font-bold tabular-nums text-espresso">{d.value || ""}</span>
            <div
              className="w-full max-w-10 rounded-t-[4px] transition group-hover:brightness-110 group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-espresso"
              style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 3 : 0, background: CHART.single }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5 text-[11px] text-wood-dark" dir="ltr">
        {data.map((d) => <span key={d.label} className="flex-1 truncate text-center">{d.label}</span>)}
      </div>
      {node}
      <TableView summary={tableLabel} head={["", valueLabel]} rows={data.map((d) => [d.label, d.value])} />
    </div>
  );
}

/** Day × hour heatmap of visits, to find the quiet hours. */
export function Heatmap({
  cells,
  days,
  hours,
  valueLabel,
  legend,
  tableLabel,
}: {
  cells: { dow: number; hour: number; count: number }[];
  days: string[];
  hours: number[];
  valueLabel: string;
  legend: { less: string; more: string };
  tableLabel: string;
}) {
  const { bind, node } = useTip();
  const map = new Map(cells.map((c) => [`${c.dow}-${c.hour}`, c.count]));
  const max = Math.max(1, ...cells.map((c) => c.count));
  const color = (v: number) => (v === 0 ? CHART.empty : CHART.ramp[Math.min(CHART.ramp.length - 1, Math.floor((v / max) * (CHART.ramp.length - 0.001)))]);

  return (
    <div>
      <div className="overflow-x-auto" dir="ltr">
        <div className="grid min-w-[560px] gap-[2px]" style={{ gridTemplateColumns: `3rem repeat(${hours.length}, minmax(0, 1fr))` }}>
          <span />
          {hours.map((h) => (
            <span key={h} className="text-center text-[11px] text-wood-dark">{h}h</span>
          ))}
          {days.map((day, i) => (
            <Row key={day} day={day}>
              {hours.map((h) => {
                const v = map.get(`${i + 1}-${h}`) ?? 0;
                return (
                  <div
                    key={h}
                    className="h-7 rounded-[3px] outline-none transition hover:ring-2 hover:ring-espresso focus-visible:ring-2 focus-visible:ring-espresso"
                    style={{ background: color(v) }}
                    {...bind(String(v), `${valueLabel} · ${day} ${h}:00–${h + 1}:00`)}
                  />
                );
              })}
            </Row>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-wood-dark" dir="ltr">
        <span>{legend.less}</span>
        {[CHART.empty, ...CHART.ramp].map((c) => <span key={c} className="size-3.5 rounded-[3px]" style={{ background: c }} />)}
        <span>{legend.more}</span>
      </div>
      {node}
      <TableView
        summary={tableLabel}
        head={["", ...hours.map((h) => `${h}h`)]}
        rows={days.map((d, i) => [d, ...hours.map((h) => map.get(`${i + 1}-${h}`) ?? 0)])}
      />
    </div>
  );
}

function Row({ day, children }: { day: string; children: ReactNode }) {
  return (
    <>
      <span className="self-center text-xs font-bold text-wood-dark">{day}</span>
      {children}
    </>
  );
}

/** Two-part bar with legend and direct labels (discount vs save). */
export function SplitBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const { bind, node } = useTip();
  const total = parts.reduce((s, p) => s + p.value, 0);
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);
  return (
    <div>
      <div className="flex h-8 gap-[2px] overflow-hidden rounded-[4px] bg-cream">
        {total > 0 &&
          parts.map((p) => (
            <div key={p.label} className="h-full outline-none hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-espresso" style={{ width: `${pct(p.value)}%`, background: p.color }} {...bind(`${p.value} (${pct(p.value)}%)`, p.label)} />
          ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2">
            <span className="size-3 rounded-[3px]" style={{ background: p.color }} aria-hidden />
            <span>{p.label}</span>
            <strong className="tabular-nums">{pct(p.value)}%</strong>
            <span className="text-wood-dark tabular-nums">({p.value})</span>
          </li>
        ))}
      </ul>
      {node}
    </div>
  );
}
