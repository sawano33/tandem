const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const eurShort = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/** 123456 → « 1 234,56 € » */
export const money = (cents: number) => eur.format(cents / 100);
/** 123456 → « 1 235 € » */
export const moneyShort = (cents: number) => eurShort.format(Math.round(cents / 100));
export const signedMoney = (cents: number) => (cents > 0 ? "+" : cents < 0 ? "−" : "") + money(Math.abs(cents));

/** « 12,5 » ou « 12.50 » → 1250 centimes. Renvoie null si invalide. */
export function parseAmount(input: string): number | null {
  const clean = input.replace(/\s|€/g, "").replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(clean)) return null;
  const cents = Math.round(parseFloat(clean) * 100);
  return cents > 0 ? cents : null;
}
export const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",").replace(",00", "");

// ---------------------------------------------------------------- Dates (sans fuseau)
export const pad = (n: number) => String(n).padStart(2, "0");
export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISODate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const today = () => toISODate(new Date());
export const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
export const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
export const monthISO = (d: Date) => `${monthKey(d)}-01`;
export const daysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
export const sameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const monthOnlyFmt = new Intl.DateTimeFormat("fr-FR", { month: "long" });
const monthShortFmt = new Intl.DateTimeFormat("fr-FR", { month: "short" });
const dayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const dayShortFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const monthLabel = (d: Date) => cap(monthFmt.format(d));
export const monthName = (d: Date) => monthOnlyFmt.format(d);
export const monthShort = (d: Date) => cap(monthShortFmt.format(d).replace(".", ""));
export const dayShort = (iso: string) => dayShortFmt.format(parseISODate(iso));

export function dayLabel(iso: string) {
  const t = today();
  const y = toISODate(new Date(Date.now() - 864e5));
  if (iso === t) return "Aujourd'hui";
  if (iso === y) return "Hier";
  return cap(dayFmt.format(parseISODate(iso)));
}

export function relativeDue(iso: string) {
  const diff = Math.round((parseISODate(iso).getTime() - parseISODate(today()).getTime()) / 864e5);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Demain";
  if (diff < 0) return dayShort(iso);
  if (diff < 7) return `Dans ${diff} jours`;
  return dayShort(iso);
}

export const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);
