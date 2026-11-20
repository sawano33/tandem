"use client";

import type { ReactNode } from "react";

/** Anneau de répartition (SVG, sans dépendance). */
export function Donut({
  segments, size = 160, thickness = 22, center,
}: { segments: { value: number; color: string }[]; size?: number; thickness?: number; center?: ReactNode }) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  const gap = segments.length > 1 ? 3 : 0;
  let offset = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={thickness} />
        {total > 0 &&
          segments.map((s, i) => {
            const len = (s.value / total) * c;
            const dash = Math.max(0, len - gap);
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
                className="transition-all duration-700"
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      {center && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>}
    </div>
  );
}

/** Barres verticales (une ou deux séries) pour l'évolution mensuelle. */
export function Bars({
  data, height = 140, colors = ["var(--strong)", "#FFAE97"], format,
}: {
  data: { label: string; values: number[]; highlight?: boolean }[];
  height?: number;
  colors?: string[];
  format?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.flatMap((d) => d.values));
  return (
    <div className="flex items-end gap-1.5" style={{ height: height + 22 }}>
      {data.map((d, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <div className="flex w-full items-end justify-center gap-[3px]" style={{ height }}>
            {d.values.map((v, j) => (
              <div
                key={j}
                title={format?.(v)}
                className="w-full max-w-4 rounded-t-md transition-all duration-700"
                style={{
                  height: `${Math.max(v > 0 ? 3 : 0, (v / max) * 100)}%`,
                  background: colors[j % colors.length],
                  opacity: d.highlight === false ? 0.45 : 1,
                }}
              />
            ))}
          </div>
          <span className={`text-[11px] ${d.highlight ? "font-semibold text-ink" : "text-muted"}`}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Petite courbe remplie (dépenses cumulées du mois). */
export function Area({ points, height = 70, color = "#C5B6F2" }: { points: number[]; height?: number; color?: string }) {
  const w = 300;
  if (points.length < 2) points = [0, ...points, ...(points.length ? [] : [0])];
  const max = Math.max(1, ...points);
  const step = w / (points.length - 1);
  const xy = points.map((p, i) => [i * step, height - 4 - (p / max) * (height - 10)] as const);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = xy[xy.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <path d={`${line} L${w},${height} L0,${height} Z`} fill={color} opacity={0.35} />
      <path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r={4} fill="#FFAE97" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Barre de répartition horizontale à deux couleurs (Guillaume / Emma / Commun). */
export function SplitBar({ parts }: { parts: { value: number; color: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div className="flex h-3 w-full gap-1 overflow-hidden rounded-full">
      {total === 0 ? (
        <div className="h-full w-full bg-track" />
      ) : (
        parts
          .filter((p) => p.value > 0)
          .map((p, i) => (
            <div key={i} className="h-full rounded-full transition-all duration-700" style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
          ))
      )}
    </div>
  );
}
