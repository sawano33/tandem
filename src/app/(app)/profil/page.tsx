"use client";

import { Bell, ChevronRight, Download, LogOut, Repeat, Scale, Shapes, UserRound, Users, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { useData } from "@/lib/store";
import { toCSV } from "@/lib/csv";
import { Avatar, Card, ListRow, Page, PageHeader } from "@/components/ui";


/* Icônes sobres : même fond pour toutes, seule la déconnexion est en rouge */
const Bubble = ({ children, danger }: { children: ReactNode; danger?: boolean }) => (
  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${danger ? "bg-over/12 text-over" : "bg-surface-2 text-lavande"}`}>
    {children}
  </span>
);

export default function ProfilPage() {
  const d = useData();

  function exportCSV() {
    const csv = toCSV(d.transactions, d);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tandem-operations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    d.toast(`${d.transactions.length} opérations exportées`);
  }

  const chev = <ChevronRight size={18} className="text-muted" />;

  return (
    <Page>
      <PageHeader title="Profil" />

      <Card className="flex items-center gap-4 !p-5">
        <Avatar profile={d.me} size={60} />
        <div className="min-w-0 flex-1">
          <p className="font-display truncate text-[24px] font-semibold text-ink">{d.me?.first_name || "Moi"}</p>
          <p className="truncate text-sm text-muted">{d.household?.name}</p>
        </div>
        {d.partner && (
          <div className="flex flex-col items-center gap-1">
            <Avatar profile={d.partner} size={34} />
            <span className="text-[11px] text-muted">{d.partner.first_name}</span>
          </div>
        )}
      </Card>

      <Card className="mt-4 py-1.5">
        <ListRow href="/profil/moi" left={<Bubble><UserRound size={18} /></Bubble>} title="Prénom et avatar" right={chev} />
        <ListRow href="/profil/categories" left={<Bubble><Shapes size={18} /></Bubble>} title="Catégories" right={chev} />
        <ListRow href="/profil/charges" left={<Bubble><Repeat size={18} /></Bubble>} title="Charges fixes" subtitle={`${d.recurring_expenses.filter((r) => r.active).length} prélèvements`} right={chev} />
        <ListRow href="/profil/partenaire" left={<Bubble><Users size={18} /></Bubble>} title="Partenaire" subtitle={d.partner ? d.partner.first_name : "Inviter"} right={chev} />
        <ListRow href="/profil/repartition" left={<Bubble><Scale size={18} /></Bubble>} title="Répartition à deux" subtitle="Qui paie combien du commun" right={chev} />
        <ListRow href="/profil/notifications" left={<Bubble><Bell size={18} /></Bubble>} title="Notifications" right={chev} />
      </Card>


      <Card className="mt-4 py-1.5">
        <ListRow onClick={exportCSV} left={<Bubble><Download size={18} /></Bubble>} title="Exporter en CSV" subtitle="Tout l'historique des opérations" />
        <ListRow onClick={d.signOut} left={<Bubble danger><LogOut size={18} /></Bubble>} title={<span className="text-over">Se déconnecter</span>} />
      </Card>

      <p className="mt-6 text-center text-xs text-muted">TANDEM · Deux vies. Un équilibre.{d.demo && " · Mode démo"}</p>
    </Page>
  );
}
