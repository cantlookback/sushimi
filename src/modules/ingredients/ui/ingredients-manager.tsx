"use client";

import { FormEvent, useState } from "react";
import { Calculator, PackagePlus, Pencil, Plus, Trash2, X } from "lucide-react";

type Unit = "g" | "ml" | "pcs";
type Ingredient = { id: string; name: string; unit: Unit; purchaseQuantity: number; purchasePrice: number; active: boolean; usageCount: number };
type Draft = { name: string; unit: Unit; purchaseQuantity: string; purchasePriceRubles: string; active: boolean };
const emptyDraft: Draft = { name: "", unit: "g", purchaseQuantity: "1000", purchasePriceRubles: "", active: true };
const unitLabels: Record<Unit, string> = { g: "г", ml: "мл", pcs: "шт." };
const formatPrice = (kopecks: number) => `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(kopecks / 100)} ₽`;

export function IngredientsManager({ initialIngredients }: { initialIngredients: Ingredient[] }) {
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [editing, setEditing] = useState<Ingredient | null | undefined>();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function openEditor(ingredient: Ingredient | null) {
    setEditing(ingredient); setError("");
    setDraft(ingredient ? { name: ingredient.name, unit: ingredient.unit, purchaseQuantity: String(ingredient.purchaseQuantity), purchasePriceRubles: String(ingredient.purchasePrice / 100), active: ingredient.active } : emptyDraft);
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setPending(true); setError("");
    const payload = { name: draft.name, unit: draft.unit, purchaseQuantity: Number(draft.purchaseQuantity), purchasePrice: Math.round(Number(draft.purchasePriceRubles.replace(",", ".")) * 100), active: draft.active };
    const response = await fetch(editing ? `/api/admin/ingredients/${editing.id}` : "/api/admin/ingredients", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (response.ok) { setIngredients((current) => editing ? current.map((item) => item.id === result.ingredient.id ? result.ingredient : item) : [...current, result.ingredient].sort((a, b) => a.name.localeCompare(b.name, "ru"))); setEditing(undefined); }
    else setError(result.error ?? "Не удалось сохранить ингредиент.");
    setPending(false);
  }

  async function remove(ingredient: Ingredient) {
    if (!confirm(`Удалить «${ingredient.name}»?`)) return;
    setError("");
    const response = await fetch(`/api/admin/ingredients/${ingredient.id}`, { method: "DELETE" });
    if (response.ok) setIngredients((current) => current.filter((item) => item.id !== ingredient.id));
    else setError((await response.json()).error ?? "Не удалось удалить ингредиент.");
  }

  return <div>
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#df3c2f]">Закупки и себестоимость</p><h1 className="mt-1 text-3xl font-black tracking-tight">Ингредиенты</h1><p className="mt-2 text-sm text-zinc-500">Укажите цену и объём закупочной упаковки</p></div><button onClick={() => openEditor(null)} className="flex items-center justify-center gap-2 rounded-xl bg-[#df3c2f] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#ed493c] hover:shadow-md active:scale-95"><Plus size={18}/>Добавить ингредиент</button></div>
    {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
    <div className="mb-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><Calculator className="mt-0.5 shrink-0" size={20}/><p><b>Пример:</b> упаковка лосося 1 000 г стоит 1 500 ₽. Если в ролле 80 г, его стоимость в рецептуре составит 120 ₽.</p></div>
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm"><div className="hidden grid-cols-[1.5fr_0.8fr_0.9fr_0.8fr_auto] gap-4 border-b border-zinc-100 px-5 py-3 text-xs font-black uppercase tracking-wide text-zinc-400 md:grid"><span>Ингредиент</span><span>Упаковка</span><span>Цена закупки</span><span>Цена единицы</span><span className="w-20"/></div>{ingredients.map((ingredient) => <article key={ingredient.id} className={`grid gap-3 border-b border-zinc-100 p-4 last:border-0 md:grid-cols-[1.5fr_0.8fr_0.9fr_0.8fr_auto] md:items-center md:px-5 ${ingredient.active ? "" : "bg-zinc-50 opacity-60"}`}><div><p className="font-extrabold">{ingredient.name}</p><p className="mt-0.5 text-xs text-zinc-400">В {ingredient.usageCount} рецептурах</p></div><p className="text-sm"><span className="mr-2 text-xs text-zinc-400 md:hidden">Упаковка:</span>{ingredient.purchaseQuantity} {unitLabels[ingredient.unit]}</p><p className="text-sm font-bold"><span className="mr-2 text-xs font-normal text-zinc-400 md:hidden">Закупка:</span>{formatPrice(ingredient.purchasePrice)}</p><p className="text-sm text-zinc-600"><span className="mr-2 text-xs text-zinc-400 md:hidden">За единицу:</span>{formatPrice(ingredient.purchasePrice / ingredient.purchaseQuantity)} / {unitLabels[ingredient.unit]}</p><div className="flex justify-end gap-2"><button onClick={() => openEditor(ingredient)} className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900" aria-label="Редактировать"><Pencil size={16}/></button><button onClick={() => remove(ingredient)} className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 text-zinc-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700" aria-label="Удалить"><Trash2 size={16}/></button></div></article>)}{!ingredients.length && <div className="py-14 text-center text-zinc-400"><PackagePlus className="mx-auto mb-3" size={34}/><p className="font-bold">Ингредиентов пока нет</p></div>}</div>

    {editing !== undefined && <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setEditing(undefined)}><form onSubmit={save} className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-zinc-100 px-6 py-5"><div><p className="text-xs font-black uppercase tracking-widest text-[#df3c2f]">Закупочная позиция</p><h2 className="mt-1 text-2xl font-black">{editing ? "Редактирование" : "Новый ингредиент"}</h2></div><button type="button" onClick={() => setEditing(undefined)} className="grid h-10 w-10 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900"><X size={20}/></button></div><div className="grid gap-5 p-6 sm:grid-cols-2">
      <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Название</span><input required minLength={2} maxLength={160} value={draft.name} onChange={(e) => setDraft({...draft,name:e.target.value})} className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-[#df3c2f]" placeholder="Например, лосось"/></label>
      <label><span className="mb-2 block text-sm font-bold">Единица учёта</span><select value={draft.unit} onChange={(e) => setDraft({...draft,unit:e.target.value as Unit})} className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 outline-none focus:border-[#df3c2f]"><option value="g">Граммы</option><option value="ml">Миллилитры</option><option value="pcs">Штуки</option></select></label>
      <label><span className="mb-2 block text-sm font-bold">Количество в упаковке</span><input required type="number" min="1" step="1" value={draft.purchaseQuantity} onChange={(e) => setDraft({...draft,purchaseQuantity:e.target.value})} className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#df3c2f]"/></label>
      <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Цена упаковки, ₽</span><input required type="number" min="0" step="0.01" value={draft.purchasePriceRubles} onChange={(e) => setDraft({...draft,purchasePriceRubles:e.target.value})} className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#df3c2f]"/></label>
      <label className="flex items-center gap-3 sm:col-span-2"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({...draft,active:e.target.checked})} className="h-5 w-5 accent-[#df3c2f]"/><span className="text-sm font-bold">Используется в работе</span></label>
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 sm:col-span-2">{error}</p>}
    </div><div className="flex justify-end gap-2 border-t border-zinc-100 bg-zinc-50 px-6 py-4"><button type="button" onClick={() => setEditing(undefined)} className="rounded-xl px-5 py-2.5 text-sm font-bold text-zinc-500 transition hover:bg-zinc-200">Отмена</button><button disabled={pending} className="rounded-xl bg-[#df3c2f] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#ed493c] active:scale-95 disabled:opacity-50">{pending ? "Сохраняем…" : "Сохранить"}</button></div></form></div>}
  </div>;
}
