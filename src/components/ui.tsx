"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Profile } from "@/lib/types";
import { LogoLoop } from "./Logo";

export const cx = clsx;

// ---------------------------------------------------------------- Mise en page
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className="bg-grad-page min-h-dvh"><main className={cx("stagger mx-auto w-full max-w-md px-5 pt-safe pb-tabbar", className)}>{children}</main></div>;
}

export function PageHeader({
  title, back, right, subtitle,
}: { title: string; back?: string; right?: ReactNode; subtitle?: string }) {
  return (
    <header className="mb-5 flex min-h-11 items-center gap-2 pt-2">
      <LogoLoop size={38} />
      {back && (
        <Link href={back} aria-label="Retour" className="press -mr-1 flex h-10 w-8 items-center justify-center rounded-full text-ink">
          <ChevronLeft size={24} />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="font-display truncate text-[28px] font-semibold leading-tight text-ink">{title}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={cx(
        "block w-full rounded-[22px] border border-line/70 bg-surface p-4 text-left",
        onClick && "press",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function SectionTitle({ children, href, action }: { children: ReactNode; href?: string; action?: string }) {
  return (
    <div className="mb-2.5 mt-7 flex items-baseline justify-between px-1">
      <h2 className="font-display text-xl font-semibold text-ink">{children}</h2>
      {href && (
        <Link href={href} className="flex items-center text-sm font-medium text-muted">
          {action ?? "Tout voir"} <ChevronRight size={16} />
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Contrôles
export function Segmented<T extends string>({
  value, onChange, options, className,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  return (
    <div className={cx("flex rounded-full bg-surface p-1", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "h-9 flex-1 rounded-full px-3 text-sm font-medium transition-colors",
            value === o.value ? "bg-strong text-on-strong" : "text-muted",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Button({
  children, onClick, variant = "primary", type = "button", disabled, className,
}: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "danger" | "ghost";
  type?: "button" | "submit"; disabled?: boolean; className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "press flex h-13 w-full items-center justify-center gap-2 rounded-2xl px-5 text-[16px] font-semibold disabled:opacity-40",
        variant === "primary" && "bg-strong text-on-strong",
        variant === "secondary" && "bg-surface-2 text-ink",
        variant === "danger" && "bg-over/10 text-over",
        variant === "ghost" && "text-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[13px] font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block px-1 text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "h-12 w-full rounded-2xl border border-line bg-surface px-4 text-ink outline-none placeholder:text-muted/60 focus:border-lavande";

export function Chip({
  active, onClick, children, color,
}: { active?: boolean; onClick?: () => void; children: ReactNode; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "press inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium",
        active ? "border-transparent bg-strong text-on-strong" : "border-line bg-surface text-ink",
      )}
      style={active && color ? { background: color, color: "#fff" } : undefined}
    >
      {children}
    </button>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 py-1 text-left"
    >
      <span className="text-[15px] text-ink">{label}</span>
      <span className={cx("relative h-7 w-12 shrink-0 rounded-full transition-colors", checked ? "bg-ok" : "bg-track")}>
        <span
          className={cx(
            "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

// ---------------------------------------------------------------- Données
export function Progress({ ratio, color, className }: { ratio: number; color?: string; className?: string }) {
  const level = ratio > 1 ? "bg-over" : ratio >= 0.8 ? "bg-warn" : "";
  return (
    <div className={cx("h-2 w-full overflow-hidden rounded-full bg-track", className)}>
      <div
        className={cx("grow-x h-full rounded-full transition-[width] duration-700 ease-out", level || (!color && "bg-lavande"))}
        style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%`, background: level ? undefined : color }}
      />
    </div>
  );
}

export function Avatar({ profile, size = 36, ring }: { profile?: Profile; size?: number; ring?: boolean }) {
  const initial = (profile?.first_name || "?").charAt(0).toUpperCase();
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-aubergine",
        ring && "ring-2 ring-bg",
      )}
      style={{ width: size, height: size, background: profile?.color ?? "#C5B6F2", fontSize: size * 0.42 }}
    >
      {profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
      ) : profile?.avatar_emoji ? (
        <span style={{ fontSize: size * 0.5 }}>{profile.avatar_emoji}</span>
      ) : (
        initial
      )}
    </span>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-muted">{icon}</div>
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 text-sm text-muted">{text}</p>}
      {action && <div className="mt-4 w-full max-w-60">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- Feuille modale
export function Sheet({
  open, onClose, title, children, footer,
}: { open: boolean; onClose: () => void; title?: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <button aria-label="Fermer" className="animate-fade absolute inset-0 bg-aubergine/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="animate-sheet relative flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-[28px] bg-bg">
        <div className="flex items-center justify-between px-5 pb-1 pt-3">
          <span className="absolute left-1/2 top-2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-line" />
          <h2 className="font-display mt-3 text-[22px] font-semibold text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Fermer" className="press mt-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface text-muted">
            <X size={18} />
          </button>
        </div>
        <div className="no-scrollbar flex-1 overflow-y-auto overflow-x-hidden px-5 pb-4 pt-3">{children}</div>
        {footer && <div className="pb-safe border-t border-line bg-bg px-5 pt-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ListRow({
  left, title, subtitle, right, href, onClick,
}: { left?: ReactNode; title: ReactNode; subtitle?: ReactNode; right?: ReactNode; href?: string; onClick?: () => void }) {
  const inner = (
    <>
      {left}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-ink">{title}</span>
        {subtitle && <span className="block truncate text-[13px] text-muted">{subtitle}</span>}
      </span>
      {right}
    </>
  );
  const cls = "press flex w-full items-center gap-3 py-2.5 text-left";
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  if (onClick) return <button onClick={onClick} className={cls}>{inner}</button>;
  return <div className="flex w-full items-center gap-3 py-2.5">{inner}</div>;
}
