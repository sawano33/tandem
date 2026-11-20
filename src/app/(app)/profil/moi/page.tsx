"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { useData } from "@/lib/store";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Avatar, Button, Card, Field, Page, PageHeader, cx, inputClass } from "@/components/ui";

const COLORS = ["#7DB0F7", "#F5A3C7", "#C5B6F2", "#FFAE97", "#7FB89A", "#E8B04B", "#5FA8CF", "#8B7FD1"];
const EMOJIS = ["", "🦊", "🐻", "🐱", "🐶", "🐺", "🌸", "🌊", "⚡️", "🍑", "🌙", "☀️"];

export default function MoiPage() {
  const d = useData();
  const [name, setName] = useState(d.me?.first_name ?? "");
  const [color, setColor] = useState(d.me?.color ?? COLORS[0]);
  const [emoji, setEmoji] = useState(d.me?.avatar_emoji ?? "");
  const [url, setUrl] = useState(d.me?.avatar_url ?? null);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  async function upload(f: File) {
    if (f.size > 2 * 1024 * 1024) return d.toast("Image trop lourde (2 Mo max).", "error");
    setBusy(true);
    if (d.demo) {
      const reader = new FileReader();
      reader.onload = () => setUrl(String(reader.result));
      reader.readAsDataURL(f);
      setBusy(false);
      return;
    }
    const sb = supabaseBrowser();
    const path = `${d.user!.id}/avatar-${Date.now()}.${f.name.split(".").pop() || "jpg"}`;
    const { error } = await sb.storage.from("avatars").upload(path, f, { upsert: true, contentType: f.type });
    setBusy(false);
    if (error) return d.toast("Envoi impossible.", "error");
    setUrl(sb.storage.from("avatars").getPublicUrl(path).data.publicUrl);
  }

  async function save() {
    if (await d.updateProfile({ first_name: name.trim(), color, avatar_emoji: emoji || null, avatar_url: url })) d.toast("Profil mis à jour");
  }

  const preview = { ...d.me!, first_name: name, color, avatar_emoji: emoji || null, avatar_url: url };

  return (
    <Page>
      <PageHeader title="Mon profil" back="/profil" />
      <div className="flex flex-col items-center">
        <button onClick={() => file.current?.click()} className="press relative" aria-label="Changer la photo">
          <Avatar profile={preview} size={104} />
          <span className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-strong text-on-strong ring-4 ring-bg">
            <Camera size={16} />
          </span>
        </button>
        <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        {url && (
          <button onClick={() => setUrl(null)} className="mt-2 text-sm text-muted">
            Retirer la photo
          </button>
        )}
      </div>

      <div className="mt-6 space-y-5">
        <Field label="Prénom">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Card>
          <p className="mb-2 text-[13px] font-medium text-muted">Ma couleur</p>
          <div className="grid grid-cols-8 gap-2">
            {COLORS.map((c) => (
              <button key={c} aria-label={c} onClick={() => setColor(c)} className={cx("press aspect-square rounded-full", color === c && "ring-2 ring-ink ring-offset-2 ring-offset-surface")} style={{ background: c }} />
            ))}
          </div>
          <p className="mb-2 mt-4 text-[13px] font-medium text-muted">Emoji (sans photo)</p>
          <div className="grid grid-cols-6 gap-2">
            {EMOJIS.map((e) => (
              <button key={e || "none"} onClick={() => setEmoji(e)} className={cx("press flex h-11 items-center justify-center rounded-xl text-xl", emoji === e ? "bg-strong text-on-strong" : "bg-surface-2")}>
                {e || "Aa"}
              </button>
            ))}
          </div>
        </Card>
        <Button onClick={save} disabled={!name.trim() || busy}>
          Enregistrer
        </Button>
      </div>
    </Page>
  );
}
