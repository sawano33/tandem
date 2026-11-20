import type { Category, Transaction } from "./types";

const KIND: Record<Transaction["kind"], string> = { expense: "Dépense", income: "Revenu", saving: "Épargne" };

const esc = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Export CSV (séparateur « ; » et virgule décimale, lisible directement par Excel/Numbers en français). */
export function toCSV(
  txs: Transaction[],
  ctx: { categories: Category[]; nameOf: (id: string | null) => string },
) {
  const head = ["Date", "Type", "Intitulé", "Catégorie", "Qui", "Montant (€)"];
  const rows = [...txs]
    .sort((a, b) => a.occurred_on.localeCompare(b.occurred_on))
    .map((t) => {
      const amount = ((t.kind === "income" ? 1 : -1) * t.amount_cents) / 100;
      return [
        t.occurred_on,
        KIND[t.kind],
        t.label,
        ctx.categories.find((c) => c.id === t.category_id)?.name ?? "",
        ctx.nameOf(t.assigned_to),
        amount.toFixed(2).replace(".", ","),
      ].map((v) => esc(String(v)));
    });
  return [head, ...rows].map((r) => r.join(";")).join("\n");
}
