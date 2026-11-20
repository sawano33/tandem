"use client";

import { ICON_NAMES, Icon, PALETTE } from "@/lib/icons";
import { cx } from "./ui";

export function IconColorPicker({
  icon, setIcon, color, setColor,
}: { icon: string; setIcon: (v: string) => void; color: string; setColor: (v: string) => void }) {
  return (
    <div>
      <p className="mb-2 px-1 text-[13px] font-medium text-muted">Couleur</p>
      <div className="grid grid-cols-7 gap-2">
        {PALETTE.map((c) => (
          <button
            key={c}
            aria-label={c}
            onClick={() => setColor(c)}
            className={cx("press aspect-square rounded-full", color === c && "ring-2 ring-ink ring-offset-2 ring-offset-bg")}
            style={{ background: c }}
          />
        ))}
      </div>
      <p className="mb-2 mt-4 px-1 text-[13px] font-medium text-muted">Icône</p>
      <div className="grid grid-cols-7 gap-2">
        {ICON_NAMES.map((n) => (
          <button
            key={n}
            aria-label={n}
            onClick={() => setIcon(n)}
            className={cx("press flex aspect-square items-center justify-center rounded-xl", icon === n ? "text-white" : "bg-surface text-ink")}
            style={icon === n ? { background: color } : undefined}
          >
            <Icon name={n} size={18} />
          </button>
        ))}
      </div>
    </div>
  );
}
