import { useSyncExternalStore } from "react";

// Mini-routeur en mémoire pour la démo autonome (un seul fichier HTML).
let current = "/login";
const subs = new Set<() => void>();
const hashName = (p: string) => p.replace(/^\//, "").replace(/[?=/]+/g, "-").replace(/-+$/, "") || "accueil";

export function navigate(to: string, replace = false) {
  if (to === current) return;
  current = to;
  try {
    const h = "#" + hashName(to);
    if (replace) history.replaceState(null, "", h);
    else history.pushState(null, "", h);
  } catch {}
  window.scrollTo(0, 0);
  subs.forEach((f) => f());
}
export const usePath = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => current,
    () => current,
  );
