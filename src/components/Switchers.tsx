"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useData } from "@/lib/store";
import { addMonths, monthLabel, monthStart, sameMonth } from "@/lib/format";
import { Avatar, cx } from "./ui";

/** Guillaume · Emma · Ensemble */
export function ScopeSwitcher({ className }: { className?: string }) {
  const { members, scope, setScope } = useData();
  if (members.length < 2) return null;
  const options = [
    ...members.map((m) => ({ value: m.user_id, label: m.profile?.first_name || "…", profile: m.profile })),
    { value: "all", label: "Ensemble", profile: undefined },
  ];
  return (
    <div className={cx("flex rounded-full bg-surface p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => setScope(o.value)}
          aria-pressed={scope === o.value}
          className={cx(
            "flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-medium transition-colors",
            scope === o.value ? "bg-strong text-on-strong" : "text-muted",
          )}
        >
          {o.value !== "all" && <Avatar profile={o.profile} size={18} />}
          <span className="truncate">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function MonthSwitcher({ className }: { className?: string }) {
  const { month, setMonth } = useData();
  const isNow = sameMonth(month, new Date());
  return (
    <div className={cx("flex items-center justify-between", className)}>
      <button aria-label="Mois précédent" onClick={() => setMonth(addMonths(month, -1))} className="press flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink">
        <ChevronLeft size={20} />
      </button>
      <button onClick={() => setMonth(monthStart(new Date()))} className="flex flex-col items-center">
        <span className="font-display text-lg font-semibold text-ink">{monthLabel(month)}</span>
        {!isNow && <span className="text-[11px] font-medium text-muted">Revenir à ce mois</span>}
      </button>
      <button aria-label="Mois suivant" onClick={() => setMonth(addMonths(month, 1))} className="press flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink">
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
