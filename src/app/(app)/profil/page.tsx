"use client";

import { Bell, ChevronRight, Download, LogOut, Repeat, Shapes, UserRound, Users, Wallet } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useData } from "@/lib/store";
import { toCSV } from "@/lib/csv";
import { Avatar, Card, ListRow, Page, PageHeader, Segmented } from "@/components/ui";

type Theme = "system" | "light" | "dark";

function applyTheme(t: Theme) {
  const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

const Bubble = ({ children, bg }: { children: ReactNode; bg: string }) => (
  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: bg }}>
    {children}
  </span>
);

export default function ProfilPage() {
  const d = useData();
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    try {
      setTheme((localStorage.getItem("tandem.theme") as Theme) || "system");
    } catch {}
  }, []);

  const changeTheme = (t: Theme) => {
    setTheme(t);
    try {
      localStorage.setItem("tandem.theme", t);
    } catch {}
    applyTheme(t);
  };

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

      <Card className="bg-grad-hero flex items-center gap-4 !p-5 text-aubergine">
        <Avatar profile={d.me} size={64} ring />
        <div className="min-w-0 flex-1">
          <p className="font-display truncate text-[24px] font-semibold">{d.me?.first_name || "Moi"}</p>
          <p className="truncate text-sm opacity-75">{d.household?.name}</p>
        </div>
        {d.partner && <Avatar profile={d.partner} size={40} ring />}
      </Card>

      <Card className="mt-4 py-1.5">
        <ListRow href="/profil/moi" left={<Bubble bg="#8B7FD1"><UserRound size={18} /></Bubble>} title="Prénom et avatar" right={chev} />
        <ListRow href="/profil/comptes" left={<Bubble bg="#251D40"><Wallet size={18} /></Bubble>} title="Comptes bancaires" subtitle={`${d.accounts.filter((a) => !a.archived).length} comptes`} right={chev} />
        <ListRow href="/profil/categories" left={<Bubble bg="#7FB89A"><Shapes size={18} /></Bubble>} title="Catégories" right={chev} />
        <ListRow href="/profil/charges" left={<Bubble bg="#FF9A80"><Repeat size={18} /></Bubble>} title="Charges fixes" subtitle={`${d.recurring_expenses.filter((r) => r.active).length} prélèvements`} right={chev} />
        <ListRow href="/profil/partenaire" left={<Bubble bg="#F5A3C7"><Users size={18} /></Bubble>} title="Partenaire" subtitle={d.partner ? d.partner.first_name : "Inviter"} right={chev} />
        <ListRow href="/profil/notifications" left={<Bubble bg="#E8B04B"><Bell size={18} /></Bubble>} title="Notifications" right={chev} />
      </Card>

      <Card className="mt-4">
        <p className="mb-2 text-[13px] font-medium text-muted">Apparence</p>
        <Segmented
          value={theme}
          onChange={changeTheme}
          className="bg-surface-2"
          options={[
            { value: "light", label: "Clair" },
            { value: "dark", label: "Sombre" },
            { value: "system", label: "Auto" },
          ]}
        />
      </Card>

      <Card className="mt-4 py-1.5">
        <ListRow onClick={exportCSV} left={<Bubble bg="#5FA8CF"><Download size={18} /></Bubble>} title="Exporter en CSV" subtitle="Tout l'historique des opérations" />
        <ListRow onClick={d.signOut} left={<Bubble bg="#E06C75"><LogOut size={18} /></Bubble>} title={<span className="text-over">Se déconnecter</span>} />
      </Card>

      <p className="mt-6 text-center text-xs text-muted">TANDEM · Deux vies. Un équilibre.{d.demo && " · Mode démo"}</p>
    </Page>
  );
}
