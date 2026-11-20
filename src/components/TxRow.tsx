"use client";

import { ArrowLeftRight } from "lucide-react";
import { useData } from "@/lib/store";
import { money } from "@/lib/format";
import { IconBubble } from "@/lib/icons";
import type { Transaction } from "@/lib/types";
import { Avatar } from "./ui";

export function TxRow({ tx }: { tx: Transaction }) {
  const { categories, accounts, openSheet, nameOf, profiles } = useData();
  const cat = categories.find((c) => c.id === tx.category_id);
  const acc = accounts.find((a) => a.id === tx.account_id);
  const to = accounts.find((a) => a.id === tx.to_account_id);
  const who = profiles.find((p) => p.id === tx.assigned_to);

  const subtitle =
    tx.kind === "transfer"
      ? `${acc?.name ?? "Compte privé"} → ${to?.name ?? "Compte privé"}`
      : [cat?.name ?? "Sans catégorie", acc?.name].filter(Boolean).join(" · ");

  return (
    <button onClick={() => openSheet({ editing: tx })} className="press flex w-full items-center gap-3 py-2.5 text-left">
      <span className="relative">
        {tx.kind === "transfer" ? (
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-muted">
            <ArrowLeftRight size={18} />
          </span>
        ) : (
          <IconBubble name={cat?.icon ?? "tag"} color={cat?.color ?? "#ABA4BF"} />
        )}
        {tx.kind !== "transfer" && (
          <span className="absolute -bottom-0.5 -right-0.5" title={nameOf(tx.assigned_to)}>
            {who ? <Avatar profile={who} size={16} ring /> : <span className="block h-4 w-4 rounded-full bg-lavande ring-2 ring-surface" />}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-ink">{tx.label || cat?.name || "Opération"}</span>
        <span className="block truncate text-[13px] text-muted">{subtitle}</span>
      </span>
      <span
        className={`tabular shrink-0 text-[15px] font-semibold ${
          tx.kind === "income" ? "text-ok" : tx.kind === "transfer" ? "text-muted" : "text-ink"
        }`}
      >
        {tx.kind === "income" ? "+" : tx.kind === "expense" ? "−" : ""}
        {money(tx.amount_cents)}
      </span>
    </button>
  );
}
