"use client";

import { confirmAction } from "@/lib/demo";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useData } from "@/lib/store";
import { IconBubble } from "@/lib/icons";
import type { Category } from "@/lib/types";
import { IconColorPicker } from "@/components/IconColorPicker";
import { Button, Card, Field, Page, PageHeader, Segmented, Sheet, inputClass } from "@/components/ui";

export default function CategoriesPage() {
  const d = useData();
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [edit, setEdit] = useState<Category | "new" | null>(null);
  const list = d.categories.filter((c) => c.kind === kind && !c.archived);

  return (
    <Page>
      <PageHeader
        title="Catégories"
        back="/profil"
        right={
          <button onClick={() => setEdit("new")} aria-label="Nouvelle catégorie" className="press flex h-10 w-10 items-center justify-center rounded-full bg-surface">
            <Plus size={22} />
          </button>
        }
      />
      <Segmented value={kind} onChange={setKind} options={[{ value: "expense", label: "Dépenses" }, { value: "income", label: "Revenus" }]} />
      <div className="mt-4 grid grid-cols-3 gap-3">
        {list.map((c) => (
          <Card key={c.id} onClick={() => setEdit(c)} className="flex flex-col items-center gap-2 !p-3 text-center">
            <IconBubble name={c.icon} color={c.color} size={46} />
            <span className="w-full truncate text-[13px] font-medium text-ink">{c.name}</span>
          </Card>
        ))}
      </div>
      <CategorySheet cat={edit} kind={kind} onClose={() => setEdit(null)} />
    </Page>
  );
}

function CategorySheet({ cat, kind, onClose }: { cat: Category | "new" | null; kind: "expense" | "income"; onClose: () => void }) {
  const d = useData();
  const c = cat && cat !== "new" ? cat : null;
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("tag");
  const [color, setColor] = useState("#C5B6F2");
  const k = cat ? (c?.id ?? "new") : "";
  if (k !== key) {
    setKey(k);
    setName(c?.name ?? "");
    setIcon(c?.icon ?? "tag");
    setColor(c?.color ?? "#C5B6F2");
  }

  async function save() {
    const row = { name: name.trim(), icon, color };
    const ok = c ? await d.update("categories", c.id, row) : !!(await d.insert("categories", { ...row, kind, sort: 100 }));
    if (ok) onClose();
  }
  async function archive() {
    if (c && confirmAction(`Masquer « ${c.name} » ? Les opérations existantes la conservent.`)) {
      await d.update("categories", c.id, { archived: true });
      onClose();
    }
  }

  return (
    <Sheet
      open={!!cat}
      onClose={onClose}
      title={c ? "Modifier la catégorie" : "Nouvelle catégorie"}
      footer={
        <div className="flex gap-2">
          {c && <Button variant="danger" className="w-auto" onClick={archive}>Masquer</Button>}
          <Button onClick={save} disabled={!name.trim()}>Enregistrer</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex justify-center">
          <IconBubble name={icon} color={color} size={72} />
        </div>
        <Field label="Nom">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jardinage" className={inputClass} />
        </Field>
        <IconColorPicker icon={icon} setIcon={setIcon} color={color} setColor={setColor} />
      </div>
    </Sheet>
  );
}
