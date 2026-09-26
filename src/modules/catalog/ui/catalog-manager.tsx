"use client";

import Image from "next/image";
import { ChangeEvent, ClipboardEvent, FormEvent, useMemo, useState } from "react";
import { Calculator, Eye, EyeOff, ImagePlus, PackageOpen, Pencil, Plus, Trash2, X } from "lucide-react";
import { withBasePath } from "@/shared/lib/base-path";

type Category = { id: string; name: string };
type AdminProduct = { id: string; categoryId: string; name: string; description: string; price: number; weightGrams: number | null; caloriesKcal: number | null; piecesCount: number | null; includedItems: string[]; badges: string[]; available: boolean; imageUrl: string };
type Ingredient = { id: string; name: string; unit: "g" | "ml" | "pcs"; purchaseQuantity: number; purchasePrice: number; active: boolean };
type RecipeRow = { ingredientId: string; quantity: number };
type RecipeDraftRow = { ingredientId: string; quantity: string };
type Draft = { categoryId: string; name: string; description: string; priceRubles: string; weightGrams: string; caloriesKcal: string; piecesCount: string; includedItems: string; badges: string; available: boolean };
const formatPrice = (kopecks: number) => `${new Intl.NumberFormat("ru-RU").format(kopecks / 100)} ₽`;

function draftFrom(product: AdminProduct | null, categoryId: string): Draft {
  return product ? { categoryId: product.categoryId, name: product.name, description: product.description, priceRubles: String(product.price / 100), weightGrams: product.weightGrams ? String(product.weightGrams) : "", caloriesKcal: product.caloriesKcal !== null ? String(product.caloriesKcal) : "", piecesCount: product.piecesCount !== null ? String(product.piecesCount) : "", includedItems: product.includedItems.join(", "), badges: product.badges.join(", "), available: product.available } : { categoryId, name: "", description: "", priceRubles: "", weightGrams: "", caloriesKcal: "", piecesCount: "", includedItems: "", badges: "", available: true };
}

export function CatalogManager({ categories, initialProducts, ingredients, initialRecipes }: { categories: Category[]; initialProducts: AdminProduct[]; ingredients: Ingredient[]; initialRecipes: Array<{ productId: string; ingredientId: string; quantity: number }> }) {
  const [products, setProducts] = useState(initialProducts);
  const [recipes, setRecipes] = useState<Record<string, RecipeRow[]>>(() => initialRecipes.reduce<Record<string, RecipeRow[]>>((grouped, row) => {
    (grouped[row.productId] ??= []).push({ ingredientId: row.ingredientId, quantity: row.quantity });
    return grouped;
  }, {}));
  const [recipeDraft, setRecipeDraft] = useState<RecipeDraftRow[]>([]);
  const [editing, setEditing] = useState<AdminProduct | null | undefined>();
  const [draft, setDraft] = useState<Draft>(() => draftFrom(null, categories[0]?.id ?? ""));
  const [image, setImage] = useState<File>();
  const [preview, setPreview] = useState("");
  const [pendingId, setPendingId] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const unavailableCount = useMemo(() => products.filter((product) => !product.available).length, [products]);

  function openEditor(product: AdminProduct | null) {
    setEditing(product); setDraft(draftFrom(product, categories[0]?.id ?? "")); setRecipeDraft(product ? (recipes[product.id] ?? []).map((row) => ({ ingredientId: row.ingredientId, quantity: String(row.quantity) })) : []); setImage(undefined); setPreview(""); setError("");
  }

  function closeEditor() {
    setEditing(undefined); setImage(undefined); if (preview) URL.revokeObjectURL(preview); setPreview("");
  }

  function selectImage(file: File) {
    if (preview) URL.revokeObjectURL(preview);
    setImage(file); setPreview(URL.createObjectURL(file));
  }

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) selectImage(file);
  }

  function pasteImage(event: ClipboardEvent<HTMLFormElement>) {
    const file = Array.from(event.clipboardData.items)
      .find((item) => item.kind === "file" && item.type.startsWith("image/"))
      ?.getAsFile();
    if (!file) return;
    event.preventDefault();
    selectImage(file);
  }

  async function toggle(product: AdminProduct) {
    setPendingId(product.id); setError("");
    const response = await fetch(withBasePath(`/api/admin/products/${product.id}/availability`), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ available: !product.available }) });
    const payload = await response.json();
    if (!response.ok) setError(payload.error ?? "Не удалось изменить товар.");
    else setProducts((current) => current.map((item) => item.id === product.id ? { ...item, available: payload.product.available } : item));
    setPendingId(undefined);
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    const payload = { categoryId: draft.categoryId, name: draft.name, description: draft.description, price: Math.round(Number(draft.priceRubles.replace(",", ".")) * 100), weightGrams: draft.weightGrams ? Number(draft.weightGrams) : null, caloriesKcal: draft.caloriesKcal ? Number(draft.caloriesKcal) : null, piecesCount: draft.piecesCount ? Number(draft.piecesCount) : null, includedItems: draft.includedItems.split(",").map((item) => item.trim()).filter(Boolean), badges: draft.badges.split(",").map((item) => item.trim()).filter(Boolean), available: draft.available };
    try {
      const response = await fetch(withBasePath(editing ? `/api/admin/products/${editing.id}` : "/api/admin/products"), { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Не удалось сохранить товар.");
      let saved: AdminProduct = result.product;
      const recipe = recipeDraft.map((row) => ({ ingredientId: row.ingredientId, quantity: Number(row.quantity) }));
      const recipeResponse = await fetch(withBasePath(`/api/admin/products/${saved.id}/recipe`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(recipe) });
      if (!recipeResponse.ok) {
        setProducts((current) => editing ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]); setEditing(saved);
        throw new Error((await recipeResponse.json()).error ?? "Товар сохранён, но рецептура не сохранилась.");
      }
      setRecipes((current) => ({ ...current, [saved.id]: recipe }));
      if (image) {
        const form = new FormData(); form.set("image", image);
        const imageResponse = await fetch(withBasePath(`/api/admin/products/${saved.id}/image`), { method: "POST", body: form });
        const imageResult = await imageResponse.json();
        if (!imageResponse.ok) {
          setProducts((current) => editing ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
          setEditing(saved);
          throw new Error(imageResult.error ?? "Товар сохранён, но фото не загрузилось.");
        }
        saved = imageResult.product;
      }
      setProducts((current) => editing ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]); closeEditor();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось сохранить товар."); }
    finally { setSaving(false); }
  }

  async function remove(product: AdminProduct) {
    if (!confirm(`Удалить «${product.name}»? Это действие нельзя отменить.`)) return;
    setPendingId(product.id); setError("");
    const response = await fetch(withBasePath(`/api/admin/products/${product.id}`), { method: "DELETE" });
    if (response.ok) setProducts((current) => current.filter((item) => item.id !== product.id));
    else setError((await response.json()).error ?? "Не удалось удалить товар.");
    setPendingId(undefined);
  }

  async function removeImage() {
    if (!editing?.imageUrl) return;
    setSaving(true);
    const response = await fetch(withBasePath(`/api/admin/products/${editing.id}/image`), { method: "DELETE" });
    const result = await response.json();
    if (response.ok) { setEditing(result.product); setProducts((current) => current.map((item) => item.id === result.product.id ? result.product : item)); }
    else setError(result.error ?? "Не удалось удалить фото.");
    setSaving(false);
  }

  function recipeCost(productId: string) {
    return (recipes[productId] ?? []).reduce((sum, row) => {
      const ingredient = ingredients.find((item) => item.id === row.ingredientId);
      return sum + (ingredient ? ingredient.purchasePrice * row.quantity / ingredient.purchaseQuantity : 0);
    }, 0);
  }

  const draftCost = recipeDraft.reduce((sum, row) => {
    const ingredient = ingredients.find((item) => item.id === row.ingredientId);
    return sum + (ingredient ? ingredient.purchasePrice * Number(row.quantity || 0) / ingredient.purchaseQuantity : 0);
  }, 0);

  return <div>
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#df3c2f]">Каталог и остатки</p><h1 className="mt-1 text-3xl font-black tracking-tight">Меню доставки</h1><p className="mt-2 text-sm text-zinc-500">Редактируйте карточки, фотографии, цены и стоп-лист</p></div><div className="flex flex-wrap items-center gap-2"><div className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold shadow-sm">В стоп-листе: {unavailableCount}</div><button onClick={() => openEditor(null)} className="flex items-center gap-2 rounded-xl bg-[#df3c2f] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#ed493c] hover:shadow-md active:translate-y-0 active:scale-95"><Plus size={18}/>Добавить товар</button></div></div>
    {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
    <div className="space-y-5">{categories.map((category) => {
      const categoryProducts = products.filter((product) => product.categoryId === category.id);
      return <section key={category.id} className="overflow-hidden rounded-2xl bg-white shadow-sm"><div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4"><h2 className="font-black">{category.name}</h2><span className="text-xs text-zinc-400">{categoryProducts.length} позиций</span></div><div className="divide-y divide-zinc-100">{categoryProducts.map((product) => { const cost = recipeCost(product.id); return <article key={product.id} className={`flex flex-col justify-between gap-4 p-4 transition sm:flex-row sm:items-center sm:px-5 ${product.available ? "hover:bg-zinc-50" : "bg-zinc-50 opacity-70"}`}><div className="flex min-w-0 items-center gap-3">{product.imageUrl ? <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-100"><Image src={product.imageUrl} alt="" fill sizes="80px" className="object-cover"/></div> : <div className={`grid h-16 w-20 shrink-0 place-items-center rounded-xl ${product.available ? "bg-orange-50 text-[#df3c2f]" : "bg-zinc-200 text-zinc-500"}`}><PackageOpen size={22}/></div>}<div className="min-w-0"><h3 className="truncate font-bold">{product.name}</h3><p className="truncate text-xs text-zinc-400">{product.weightGrams ? `${product.weightGrams} г · ` : ""}{formatPrice(product.price)}</p><p className="mt-1 line-clamp-1 text-xs text-zinc-500">{cost ? `Себестоимость ${formatPrice(cost)} · Фудкост ${Math.round(cost / product.price * 100)}%` : "Рецептура не заполнена"}</p></div></div><div className="flex flex-wrap items-center justify-end gap-2"><button onClick={() => openEditor(product)} className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 text-zinc-500 transition hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900" aria-label="Редактировать"><Pencil size={16}/></button><button disabled={pendingId === product.id} onClick={() => remove(product)} className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 text-zinc-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50" aria-label="Удалить"><Trash2 size={16}/></button><button disabled={pendingId === product.id} onClick={() => toggle(product)} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition active:scale-95 disabled:opacity-50 ${product.available ? "border border-zinc-200 bg-white text-zinc-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>{product.available ? <EyeOff size={16}/> : <Eye size={16}/>} {pendingId === product.id ? "Сохраняем…" : product.available ? "В стоп-лист" : "Вернуть"}</button></div></article>;})}</div></section>;
    })}</div>
    {editing !== undefined && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/45 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && closeEditor()}><form onSubmit={save} onPaste={pasteImage} className="my-auto w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-zinc-100 px-6 py-5"><div><p className="text-xs font-black uppercase tracking-widest text-[#df3c2f]">Карточка товара</p><h2 className="mt-1 text-2xl font-black">{editing ? "Редактирование" : "Новый товар"}</h2></div><button type="button" onClick={closeEditor} className="grid h-10 w-10 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900"><X size={20}/></button></div><div className="grid max-h-[70vh] gap-5 overflow-y-auto p-6 sm:grid-cols-2">
      <div className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Фотография</span><div className="flex flex-col gap-3 sm:flex-row">{preview || editing?.imageUrl ? <div className="relative aspect-[16/10] w-full max-w-56 overflow-hidden rounded-2xl bg-zinc-100"><Image src={preview || editing?.imageUrl || ""} alt="Предпросмотр" fill sizes="224px" unoptimized={Boolean(preview)} className="object-cover"/></div> : <div className="grid aspect-[16/10] w-full max-w-56 place-items-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 text-zinc-400"><ImagePlus size={30}/></div>}<div className="flex flex-col justify-center gap-2"><label className="rounded-xl bg-zinc-900 px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-zinc-700"><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={chooseImage}/>{editing?.imageUrl || preview ? "Заменить фото" : "Загрузить фото"}</label>{editing?.imageUrl && !preview && <button type="button" disabled={saving} onClick={removeImage} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50">Удалить фото</button>}<p className="text-xs leading-5 text-zinc-400">Выберите файл или вставьте картинку через Ctrl+V<br/>JPG, PNG, WebP или AVIF, до 8 МБ</p></div></div></div>
      <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Название</span><input required minLength={2} maxLength={160} value={draft.name} onChange={(e) => setDraft({...draft,name:e.target.value})} className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-[#df3c2f]"/></label>
      <label><span className="mb-2 block text-sm font-bold">Категория</span><select required value={draft.categoryId} onChange={(e) => setDraft({...draft,categoryId:e.target.value})} className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 outline-none transition focus:border-[#df3c2f]">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label><span className="mb-2 block text-sm font-bold">Цена, ₽</span><input required min="0" step="0.01" type="number" value={draft.priceRubles} onChange={(e) => setDraft({...draft,priceRubles:e.target.value})} className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-[#df3c2f]"/></label>
      <label><span className="mb-2 block text-sm font-bold">Вес, г</span><input min="1" step="1" type="number" value={draft.weightGrams} onChange={(e) => setDraft({...draft,weightGrams:e.target.value})} className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-[#df3c2f]"/></label>
      <label><span className="mb-2 block text-sm font-bold">Калорийность, ккал</span><input min="0" step="1" type="number" value={draft.caloriesKcal} onChange={(e) => setDraft({...draft,caloriesKcal:e.target.value})} className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-[#df3c2f]"/></label>
      <label><span className="mb-2 block text-sm font-bold">Количество штук</span><input min="1" step="1" type="number" value={draft.piecesCount} onChange={(e) => setDraft({...draft,piecesCount:e.target.value})} className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-[#df3c2f]"/></label>
      <label><span className="mb-2 block text-sm font-bold">Бейджи через запятую</span><input maxLength={150} placeholder="Хит, Новинка" value={draft.badges} onChange={(e) => setDraft({...draft,badges:e.target.value})} className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-[#df3c2f]"/></label>
      <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">В комплекте, через запятую</span><input maxLength={1000} placeholder="Имбирь, васаби, соевый соус, палочки" value={draft.includedItems} onChange={(e) => setDraft({...draft,includedItems:e.target.value})} className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-[#df3c2f]"/><span className="mt-1 block text-xs text-zinc-400">Для сетов укажите бесплатные добавки, которые выдаются вместе с заказом.</span></label>
      <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Состав и описание</span><textarea rows={3} maxLength={2000} value={draft.description} onChange={(e) => setDraft({...draft,description:e.target.value})} className="w-full resize-none rounded-xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-[#df3c2f]"/></label>
      <div className="sm:col-span-2"><div className="mb-3 flex items-center justify-between gap-3"><div><span className="block text-sm font-bold">Рецептура</span><span className="text-xs text-zinc-400">Количество указывается в единицах ингредиента</span></div><button type="button" disabled={!ingredients.length || recipeDraft.length >= ingredients.length} onClick={() => { const ingredient = ingredients.find((item) => !recipeDraft.some((row) => row.ingredientId === item.id)); if (ingredient) setRecipeDraft([...recipeDraft, { ingredientId: ingredient.id, quantity: "" }]); }} className="flex items-center gap-1 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-black transition hover:bg-zinc-100 disabled:opacity-40"><Plus size={15}/>Ингредиент</button></div><div className="space-y-2">{recipeDraft.map((row, index) => { const ingredient = ingredients.find((item) => item.id === row.ingredientId); return <div key={`${row.ingredientId}-${index}`} className="grid grid-cols-[1fr_110px_40px] gap-2"><select value={row.ingredientId} onChange={(e) => setRecipeDraft(recipeDraft.map((item, rowIndex) => rowIndex === index ? {...item,ingredientId:e.target.value} : item))} className="min-w-0 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#df3c2f]">{ingredients.filter((item) => item.id === row.ingredientId || !recipeDraft.some((recipeItem) => recipeItem.ingredientId === item.id)).map((item) => <option key={item.id} value={item.id}>{item.name}{item.active ? "" : " (неактивен)"}</option>)}</select><label className="relative"><input required type="number" min="1" step="1" value={row.quantity} onChange={(e) => setRecipeDraft(recipeDraft.map((item, rowIndex) => rowIndex === index ? {...item,quantity:e.target.value} : item))} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 pr-10 text-sm outline-none focus:border-[#df3c2f]"/><span className="absolute right-3 top-3 text-xs text-zinc-400">{ingredient ? ({g:"г",ml:"мл",pcs:"шт."} as const)[ingredient.unit] : ""}</span></label><button type="button" onClick={() => setRecipeDraft(recipeDraft.filter((_, rowIndex) => rowIndex !== index))} className="grid h-10 w-10 place-items-center rounded-xl text-zinc-400 transition hover:bg-red-50 hover:text-red-700"><Trash2 size={16}/></button></div>;})}{!recipeDraft.length && <p className="rounded-xl border border-dashed border-zinc-200 py-5 text-center text-xs text-zinc-400">Добавьте ингредиенты, чтобы рассчитать себестоимость</p>}</div><div className="mt-3 grid gap-2 rounded-2xl bg-zinc-900 p-4 text-white sm:grid-cols-3"><div><p className="text-xs text-white/50">Себестоимость</p><p className="mt-1 font-black">{formatPrice(draftCost)}</p></div><div><p className="text-xs text-white/50">Фудкост</p><p className="mt-1 font-black">{draft.priceRubles && Number(draft.priceRubles) ? `${Math.round(draftCost / (Number(draft.priceRubles) * 100) * 100)}%` : "—"}</p></div><div><p className="text-xs text-white/50">Валовая маржа</p><p className="mt-1 font-black">{draft.priceRubles ? formatPrice(Number(draft.priceRubles) * 100 - draftCost) : "—"}</p></div></div>{!ingredients.length && <p className="mt-2 flex items-center gap-2 text-xs font-bold text-amber-700"><Calculator size={14}/>Сначала добавьте ингредиенты в соответствующем разделе CRM.</p>}</div>
      <label className="flex items-center gap-3 sm:col-span-2"><input type="checkbox" checked={draft.available} onChange={(e) => setDraft({...draft,available:e.target.checked})} className="h-5 w-5 accent-[#df3c2f]"/><span className="text-sm font-bold">Показывать товар на сайте</span></label>
    </div><div className="flex justify-end gap-2 border-t border-zinc-100 bg-zinc-50 px-6 py-4"><button type="button" onClick={closeEditor} className="rounded-xl px-5 py-2.5 text-sm font-bold text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-900">Отмена</button><button disabled={saving} className="rounded-xl bg-[#df3c2f] px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#ed493c] active:scale-95 disabled:opacity-50">{saving ? "Сохраняем…" : "Сохранить"}</button></div></form></div>}
  </div>;
}
