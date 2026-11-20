"use client";

import { useEffect } from "react";
import { useData } from "@/lib/store";
import { DEFAULT_NOTIF } from "@/lib/types";
import { budgetLines, goalSaved, upcomingCharges } from "@/lib/finance";
import { money, today, parseISODate } from "@/lib/format";
import { allowed, notify, once } from "@/lib/notify";

/**
 * Notifications locales déclenchées à l'ouverture et à chaque synchronisation :
 * rappels de charges, budgets à 80 % / dépassés, objectifs atteints.
 * (Les notifications « app fermée » nécessitent un envoi Web Push serveur — voir README.)
 */
export function NotificationEngine() {
  const d = useData();
  const prefs = { ...DEFAULT_NOTIF, ...(d.me?.notification_prefs ?? {}) };

  useEffect(() => {
    if (!d.ready) return;
    const t = today();
    if (allowed(prefs, "charges")) {
      for (const o of upcomingCharges(d.recurring_expenses, d.scheduled_transactions, "all", 10)) {
        const days = Math.round((parseISODate(o.due_on).getTime() - parseISODate(t).getTime()) / 864e5);
        if (days >= 0 && days <= prefs.charges_days && once(`charge-${o.recurring.id}-${o.due_on}`)) {
          notify(`${o.recurring.label} : ${money(o.amount_cents)}`, days === 0 ? "Prélevé aujourd'hui." : `Prélèvement dans ${days} jour${days > 1 ? "s" : ""}.`, `charge-${o.recurring.id}`);
        }
      }
    }
    for (const l of budgetLines(d.budgets, d.categories, d.transactions, new Date())) {
      const key = `budget-${l.budget.category_id}-${t.slice(0, 7)}-${l.level}`;
      if (l.level === "over" && allowed(prefs, "budget_over") && once(key))
        notify(`Budget ${l.category?.name} dépassé`, `${money(l.spent)} sur ${money(l.budget.amount_cents)}.`, key);
      if (l.level === "warn" && allowed(prefs, "budget_warn") && once(key))
        notify(`Budget ${l.category?.name} à ${Math.round(l.ratio * 100)} %`, `Il reste ${money(l.remaining)}.`, key);
    }
    if (allowed(prefs, "goals")) {
      for (const g of d.savings_goals) {
        if (!g.archived && goalSaved(g, d.savings_contributions) >= g.target_cents && once(`goal-${g.id}`))
          notify(`Objectif « ${g.name} » atteint 🎉`, `${money(g.target_cents)} épargnés ensemble.`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.ready, d.transactions, d.budgets, d.recurring_expenses, d.scheduled_transactions, d.savings_contributions]);

  return null;
}
