"use client";

import { useCallback, useState } from "react";
import { useData } from "@/lib/store";
import { Splash } from "./Logo";
import { TabBar } from "./TabBar";
import { AddSheet } from "./AddSheet";
import { Toasts } from "./Toasts";
import { NotificationEngine } from "./NotificationEngine";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready } = useData();
  const [splash, setSplash] = useState(true);
  const done = useCallback(() => setSplash(false), []);
  return (
    <>
      {ready && (
        <>
          {children}
          <TabBar />
          <AddSheet />
          <Toasts />
          <NotificationEngine />
        </>
      )}
      {splash && <Splash ready={ready} onDone={done} />}
    </>
  );
}
