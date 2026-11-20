"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff } from "lucide-react";
import { useData } from "@/lib/store";
import { DEFAULT_NOTIF, type NotificationPrefs } from "@/lib/types";
import { notify } from "@/lib/notify";
import { Button, Card, Chip, Page, PageHeader, Toggle } from "@/components/ui";

export default function NotificationsPage() {
  const d = useData();
  const [prefs, setPrefs] = useState<NotificationPrefs>({ ...DEFAULT_NOTIF, ...(d.me?.notification_prefs ?? {}) });
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  const set = async <K extends keyof NotificationPrefs>(k: K, v: NotificationPrefs[K]) => {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    await d.updateProfile({ notification_prefs: next });
  };

  async function ask() {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === "granted") notify("TANDEM", "Les notifications sont activées.");
  }

  const partnerName = d.partner?.first_name ?? "votre partenaire";

  return (
    <Page>
      <PageHeader title="Notifications" back="/profil" />

      <Card className="bg-grad-night !p-5 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
            {permission === "granted" ? <BellRing size={22} /> : <BellOff size={22} />}
          </span>
          <div className="flex-1">
            <p className="font-semibold">
              {permission === "granted" ? "Autorisées sur cet appareil" : permission === "denied" ? "Bloquées sur cet appareil" : "Pas encore autorisées"}
            </p>
            <p className="text-[13px] text-white/70">
              {permission === "unsupported"
                ? "Sur iPhone : ajoutez TANDEM à l'écran d'accueil, puis ouvrez-la depuis l'icône."
                : permission === "denied"
                  ? "Réactivez-les dans Réglages → TANDEM → Notifications."
                  : "TANDEM vous prévient au bon moment."}
            </p>
          </div>
        </div>
        {permission === "default" && (
          <Button onClick={ask} className="bg-grad-cta mt-4 !text-aubergine">
            Autoriser les notifications
          </Button>
        )}
      </Card>

      <Card className="mt-4">
        <Toggle checked={prefs.enabled} onChange={(v) => set("enabled", v)} label="Activer les notifications" />
      </Card>

      <div className={prefs.enabled ? "" : "pointer-events-none opacity-40"}>
        <p className="mb-2 mt-6 px-1 text-[13px] font-medium uppercase tracking-wide text-muted">Budgets</p>
        <Card className="space-y-3">
          <Toggle checked={prefs.budget_warn} onChange={(v) => set("budget_warn", v)} label="Budget atteint à 80 %" />
          <Toggle checked={prefs.budget_over} onChange={(v) => set("budget_over", v)} label="Budget dépassé" />
        </Card>

        <p className="mb-2 mt-6 px-1 text-[13px] font-medium uppercase tracking-wide text-muted">Charges fixes</p>
        <Card className="space-y-3">
          <Toggle checked={prefs.charges} onChange={(v) => set("charges", v)} label="Rappel avant un prélèvement" />
          {prefs.charges && (
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 7].map((n) => (
                <Chip key={n} active={prefs.charges_days === n} onClick={() => set("charges_days", n)}>
                  {n === 0 ? "Le jour même" : n === 1 ? "La veille" : `${n} jours avant`}
                </Chip>
              ))}
            </div>
          )}
        </Card>

        <p className="mb-2 mt-6 px-1 text-[13px] font-medium uppercase tracking-wide text-muted">À deux</p>
        <Card className="space-y-3">
          <Toggle checked={prefs.partner} onChange={(v) => set("partner", v)} label={`Quand ${partnerName} ajoute une dépense`} />
          {prefs.partner && (
            <div className="flex flex-wrap gap-2">
              {[0, 2000, 5000, 10000].map((c) => (
                <Chip key={c} active={prefs.partner_min_cents === c} onClick={() => set("partner_min_cents", c)}>
                  {c === 0 ? "Toutes" : `Plus de ${c / 100} €`}
                </Chip>
              ))}
            </div>
          )}
          <Toggle checked={prefs.goals} onChange={(v) => set("goals", v)} label="Objectif d'épargne atteint" />
        </Card>

        <p className="mb-2 mt-6 px-1 text-[13px] font-medium uppercase tracking-wide text-muted">Récap & calme</p>
        <Card className="space-y-3">
          <Toggle checked={prefs.weekly} onChange={(v) => set("weekly", v)} label="Récap de la semaine (dimanche soir)" />
          <Toggle checked={prefs.quiet} onChange={(v) => set("quiet", v)} label="Silence la nuit (22 h – 8 h)" />
        </Card>

        {permission === "granted" && (
          <Button variant="secondary" className="mt-6" onClick={() => notify("Budget Restaurants à 85 %", "127,50 € dépensés sur 150 € ce mois-ci.")}>
            Envoyer une notification test
          </Button>
        )}
      </div>
    </Page>
  );
}
