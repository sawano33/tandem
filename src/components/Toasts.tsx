"use client";

import { useData } from "@/lib/store";
import { cx } from "./ui";

export function Toasts() {
  const { toasts } = useData();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-safe">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cx(
            "animate-rise mt-1 w-full max-w-sm rounded-2xl px-4 py-3 text-sm font-medium shadow-lg",
            t.tone === "error" ? "bg-over text-white" : t.tone === "warn" ? "bg-peche text-aubergine" : "bg-aubergine text-white",
          )}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
