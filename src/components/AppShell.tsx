"use client";

import { useData } from "@/lib/store";
import { LogoMark } from "./Logo";
import { TabBar } from "./TabBar";
import { AddSheet } from "./AddSheet";
import { Toasts } from "./Toasts";
import { NotificationEngine } from "./NotificationEngine";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready } = useData();
  if (!ready) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <LogoMark size={64} animated className="text-ink" />
        <p className="text-sm text-muted">Synchronisation…</p>
      </div>
    );
  }
  return (
    <>
      {children}
      <TabBar />
      <AddSheet />
      <Toasts />
      <NotificationEngine />
    </>
  );
}
