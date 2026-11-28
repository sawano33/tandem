"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useData } from "@/lib/store";
import { occurrencesForMonth, type Occurrence } from "@/lib/finance";
import { addMonths, today } from "@/lib/format";
import { cx } from "./ui";

/** Case à cocher « payée » d'une échéance de charge fixe. */
export function ChargeCheck({ o, size = 30 }: { o: Occurrence; size?: number }) {
  const d = useData();
  const [busy, setBusy] = useState(false);
  const paid = o.status === "paid";
  async function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const ok = paid ? await d.unpayCharge(o) : await d.payCharge(o);
    setBusy(false);
    if (ok) d.toast(paid ? `${o.recurring.label} : remise à venir` : `${o.recurring.label} payée`);
  }
  return (
    <button
      onClick={toggle}
      aria-label={paid ? `Marquer ${o.recurring.label} comme non payée` : `Marquer ${o.recurring.label} comme payée`}
      aria-pressed={paid}
      className={cx(
        "press flex shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200",
        paid ? "border-ok bg-ok text-aubergine" : "border-line bg-transparent text-transparent",
        busy && "opacity-50",
      )}
      style={{ width: size, height: size }}
    >
      <Check size={size * 0.55} strokeWidth={3} />
    </button>
  );
}

/**
 * Prélèvement automatique : à l'ouverture de l'app, chaque charge « auto » dont la date est passée
 * (ce mois-ci et le mois dernier) est marquée payée et comptée dans les dépenses. Idempotent côté base.
 */
export function AutoSettle() {
  const d = useData();
  const running = useRef(false);
  useEffect(() => {
    if (!d.ready || running.current) return;
    const t = today();
    const now = new Date();
    const due = [...occurrencesForMonth(d.recurring_expenses, d.scheduled_transactions, addMonths(now, -1), "all"), ...occurrencesForMonth(d.recurring_expenses, d.scheduled_transactions, now, "all")]
      .filter((o) => o.status === "pending" && !o.held && o.recurring.auto_pay !== false && o.due_on <= t);
    if (!due.length) return;
    running.current = true;
    (async () => {
      for (const o of due) await d.payCharge(o, true);
      running.current = false;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.ready, d.recurring_expenses, d.scheduled_transactions]);
  return null;
}
