"use client";

import { PiggyBank } from "lucide-react";
import { useData } from "@/lib/store";
import { money } from "@/lib/format";
import { IconBubble } from "@/lib/icons";
import type { Transaction } from "@/lib/types";
import { Avatar } from "./ui";

export function TxRow({ tx }: { tx: Transaction }) {
  const { categories, openSheet, nameOf, profiles } = useData();
  const cat = categories.find((c) => c.id === tx.category_id);
  const who = profiles.find((p) => p.id === tx.assigned_to);

  return (
    <button onClick={() => openSheet({ editing: tx })} className="press flex w-full items-center gap-3 py-2.5 text-left">
      <span className="relative">
        {tx.kind === "saving" ? (
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-lavande/20 text-lavande">
            <PiggyBank size={18} />
          </span>
        ) : (
          <IconBubble name={cat?.icon ?? "tag"} color={cat?.color ?? "#ABA4BF"} />
        )}
        <span className="absolute -bottom-0.5 -right-0.5" title={nameOf(tx.assigned_to)}>
          {who ? <Avatar profile={who} size={16} ring /> : <span className="block h-4 w-4 rounded-full bg-lavande ring-2 ring-surface" />}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-ink">{tx.label || cat?.name || "Opération"}</span>
        <span className="block truncate text-[13px] text-muted">
          {tx.kind === "saving" ? "Épargne" : cat?.name ?? "Sans catégorie"} · {nameOf(tx.assigned_to)}
        </span>
      </span>
      <span className={`tabular shrink-0 text-[15px] font-semibold ${tx.kind === "income" ? "text-ok" : tx.kind === "saving" ? "text-lavande" : "text-ink"}`}>
        {tx.kind === "income" ? "+" : tx.kind === "expense" ? "−" : ""}
        {money(tx.amount_cents)}
      </span>
    </button>
  );
}
