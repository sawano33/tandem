import type { Account, Category, Transaction } from "./types";

const KIND: Record<Transaction["kind"], string> = { expense: "Dépense", income: "Revenu", transfer: "Virement" };

const esc = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Export CSV (séparateur « ; » et virgule décimale, lisible directement par Excel/Numbers en français). */
export function toCSV(
  txs: Transaction[],
  ctx: { accounts: Account[]; categories: Category[]; nameOf: (id: string | null) => string },
) {
  const head = ["Date", "Type", "Intitulé", "Catégorie", "Compte", "Vers le compte", "Attribution", "Montant (€)"];
  const rows = [...txs]
    .sort((a, b) => a.occurred_on.localeCompare(b.occurred_on))
    .map((t) => {
      const sign = t.kind === "expense" ? -1 : t.kind === "income" ? 1 : 0;
      const amount = ((sign || 1) * t.amount_cents) / 100;
      return [
        t.occurred_on,
        KIND[t.kind],
        t.label,
        ctx.categories.find((c) => c.id === t.category_id)?.name ?? "",
        ctx.accounts.find((a) => a.id === t.account_id)?.name ?? "Compte privé",
        t.to_account_id ? ctx.accounts.find((a) => a.id === t.to_account_id)?.name ?? "Compte privé" : "",
        t.kind === "transfer" ? "" : ctx.nameOf(t.assigned_to),
        amount.toFixed(2).replace(".", ","),
      ].map((v) => esc(String(v)));
    });
  return [head, ...rows].map((r) => r.join(";")).join("\n");
}
