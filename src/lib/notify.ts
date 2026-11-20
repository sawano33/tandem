import type { NotificationPrefs } from "./types";

/** Affiche une notification système (via le service worker si possible, indispensable sur iOS). */
export async function notify(title: string, body: string, tag?: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, { body, tag, icon: "/icons/icon-192.png", badge: "/icons/badge-96.png" });
      return true;
    }
    new Notification(title, { body, tag, icon: "/icons/icon-192.png" });
    return true;
  } catch {
    return false;
  }
}

export function allowed(prefs: NotificationPrefs | null | undefined, key: keyof NotificationPrefs) {
  if (!prefs || !prefs.enabled || !prefs[key]) return false;
  if (prefs.quiet) {
    const h = new Date().getHours();
    if (h >= 22 || h < 8) return false;
  }
  return true;
}

/** Une seule notification par clé et par jour (ex. rappel de charge). */
export function once(key: string) {
  try {
    const k = `tandem.notified.${key}`;
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(k) === today) return false;
    localStorage.setItem(k, today);
    return true;
  } catch {
    return true;
  }
}
