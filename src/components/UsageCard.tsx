"use client";

import { useState } from "react";
import { money, moneyShort } from "@/lib/format";
import type { usageSlices } from "@/lib/finance";
import { Pie } from "./Charts";
import { cx } from "./ui";

type Usage = ReturnType<typeof usageSlices>;

/** Camembert d'utilisation des revenus : vue d'ensemble (barre empilée), camembert détaillé, légende cliquable. */
export function UsageCard({ usage, income, estimated, title = "Où va l'argent" }: { usage: Usage; income: number; estimated?: boolean; title?: string }) {
  const [slice, setSlice] = useState<string | null>(null);
  const sel = usage.slices.find((x) => x.id === slice);
  const groups = usage.groups.filter((g) => g.cents > 0);

  return (
    <section className="rounded-[26px] border border-line/70 bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[20px] font-semibold text-ink">{title}</h2>
        <span className="text-[12.5px] text-muted">
          sur <span className="font-num tabular font-semibold text-ink">{moneyShort(income)}</span>
          {estimated ? " prévus" : ""}
        </span>
      </div>

      {/* Vue d'ensemble : dépensé / épargné / à venir / reste */}
      <div className="mt-4 flex h-2.5 w-full gap-[3px] overflow-hidden rounded-full">
        {groups.map((g) => (
          <div key={g.id} className="grow-x h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${g.share * 100}%`, background: g.color }} />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
        {groups.map((g) => (
          <div key={g.id} className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: g.color }} />
            <span className="text-[13px] text-muted">{g.name}</span>
            <span className="font-num tabular ml-auto text-[13px] font-semibold text-ink">{moneyShort(g.cents)}</span>
          </div>
        ))}
      </div>
      {usage.overspent > 0 && (
        <p className="mt-3 rounded-xl bg-over/12 px-3 py-2 text-center text-[13px] font-medium text-over">
          Dépassement de {money(usage.overspent)} sur les revenus
        </p>
      )}

      {/* Camembert */}
      <div className="mt-5 flex justify-center">
        <Pie size={224} slices={usage.slices.map((x) => ({ id: x.id, value: x.cents, color: x.color }))} selected={slice} onSelect={setSlice} />
      </div>
      <div className="mt-3 h-11 text-center">
        {sel ? (
          <>
            <p key={sel.id} className="num-in font-num tabular text-[20px] font-semibold leading-tight text-ink">{money(sel.cents)}</p>
            <p className="truncate text-[12.5px] text-muted">
              {sel.name} · {Math.round(sel.share * 100)} % des revenus{sel.detail ? ` · ${sel.detail}` : ""}
            </p>
          </>
        ) : (
          <p className="pt-3 text-[12.5px] text-muted">Touchez une part pour le détail</p>
        )}
      </div>

      {/* Légende */}
      <ul className="mt-2 -mx-2">
        {usage.slices.map((x) => (
          <li key={x.id}>
            <button
              onClick={() => setSlice(slice === x.id ? null : x.id)}
              className={cx(
                "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors",
                slice === x.id ? "bg-surface-2" : "",
                slice && slice !== x.id && "opacity-50",
              )}
            >
              <span className="h-3 w-3 shrink-0 rounded-[4px]" style={{ background: x.color }} />
              <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{x.name}</span>
              <span className="font-num tabular text-[14px] font-semibold text-ink">{moneyShort(x.cents)}</span>
              <span className="font-num tabular w-10 text-right text-[12.5px] text-muted">{Math.round(x.share * 100)}%</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
