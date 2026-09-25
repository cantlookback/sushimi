"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronRight, Flame, Grid3X3, Minus, PackageCheck, Plus, Scale, ShoppingBag, Sparkles, X } from "lucide-react";
import type { Catalog, Product } from "../domain/product";
import { CheckoutDialog } from "@/modules/orders/ui/checkout-dialog";
import type { PlatformSettings } from "@/modules/settings/domain/platform-settings";

const formatPrice = (kopecks: number) => `${new Intl.NumberFormat("ru-RU").format(kopecks / 100)} ₽`;

function ProductDetailsDialog({ product, canOrder, onClose, onAdd }: { product: Product; canOrder: boolean; onClose: () => void; onAdd: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section role="dialog" aria-modal="true" aria-labelledby="product-details-title" className="my-auto w-full max-w-3xl overflow-hidden rounded-[2rem] bg-[#fffdf8] shadow-2xl">
      <div className="grid md:grid-cols-[0.9fr_1.1fr]">
        <div className="relative min-h-64 bg-gradient-to-br from-[#f4c3a2] via-[#e46c52] to-[#87352c] md:min-h-full">
          {product.imageUrl ? <Image src={product.imageUrl} alt={product.name} fill sizes="(max-width: 768px) 100vw, 45vw" className="object-cover" /> : <div className="grid h-full min-h-64 place-items-center"><div className="h-36 w-36 rounded-full border-[18px] border-[#f7eee4] bg-[#dd614d] shadow-2xl"><div className="m-auto mt-6 h-16 w-16 rounded-full bg-[#8eb66b]" /></div></div>}
        </div>
        <div className="relative p-6 sm:p-8">
          <button onClick={onClose} aria-label="Закрыть" className="absolute right-4 top-4 grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-black/5 text-[#706d65] transition hover:bg-black/10 hover:text-black active:scale-95"><X size={20}/></button>
          <div className="pr-10"><div className="mb-3 flex flex-wrap gap-2">{product.badges.map((badge) => <span key={badge} className="rounded-full bg-red-50 px-3 py-1 text-xs font-extrabold text-[#b92d24]">{badge}</span>)}</div><h2 id="product-details-title" className="text-3xl font-black tracking-tight">{product.name}</h2></div>
          {product.description && <p className="mt-3 text-sm leading-6 text-[#706d65]">{product.description}</p>}
          <div className="mt-6 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-[#f4efe6] p-3"><Scale size={18} className="text-[#df3c2f]"/><p className="mt-2 text-xs text-[#77736b]">Вес</p><p className="font-black">{product.weightGrams ? `${product.weightGrams} г` : "—"}</p></div>
            <div className="rounded-2xl bg-[#f4efe6] p-3"><Flame size={18} className="text-[#df3c2f]"/><p className="mt-2 text-xs text-[#77736b]">Калорийность</p><p className="font-black">{product.caloriesKcal !== null ? `${product.caloriesKcal} ккал` : "—"}</p></div>
            <div className="rounded-2xl bg-[#f4efe6] p-3"><Grid3X3 size={18} className="text-[#df3c2f]"/><p className="mt-2 text-xs text-[#77736b]">Количество</p><p className="font-black">{product.piecesCount !== null ? `${product.piecesCount} шт.` : "—"}</p></div>
          </div>
          <div className="mt-6"><h3 className="text-sm font-black uppercase tracking-[0.12em] text-[#77736b]">Состав</h3><p className="mt-2 text-sm leading-6">{product.composition.length ? product.composition.join(", ") : "Состав не указан"}</p></div>
          {product.includedItems.length > 0 && <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50 p-4"><h3 className="flex items-center gap-2 font-black text-[#9d3a25]"><PackageCheck size={18}/>В комплекте</h3><ul className="mt-2 grid gap-1 text-sm text-[#704638]">{product.includedItems.map((item) => <li key={item}>• {item}</li>)}</ul></div>}
          <div className="mt-7 flex items-center justify-between gap-4"><strong className="text-2xl">{formatPrice(product.price)}</strong><button disabled={!canOrder} onClick={onAdd} className="cursor-pointer rounded-full bg-[#df3c2f] px-6 py-3 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#ee4a3d] hover:shadow-md active:translate-y-0 active:scale-[0.96] disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none">В корзину</button></div>
        </div>
      </div>
    </section>
  </div>;
}

export function CatalogExperience({ catalog, settings }: { catalog: Catalog; settings: PlatformSettings }) {
  const [activeCategory, setActiveCategory] = useState(catalog.categories[0]?.id ?? "");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product>();
  const products = catalog.products.filter((product) => product.categoryId === activeCategory);
  const cartProducts = useMemo(() => catalog.products.filter((product) => cart[product.id]), [cart, catalog.products]);
  const extraGroups = catalog.categories.filter((category) => category.slug === "additions" || category.slug === "sauces");
  const count = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const total = cartProducts.reduce((sum, product) => sum + product.price * cart[product.id], 0);

  const changeQuantity = (product: Product, difference: number) => {
    setCart((current) => {
      const quantity = Math.max(0, (current[product.id] ?? 0) + difference);
      const next = { ...current };
      if (quantity === 0) delete next[product.id];
      else next[product.id] = quantity;
      return next;
    });
  };

  return (
    <main className="min-h-screen pb-28">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-[#f7f4ee]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
          <a href="#" className="rounded-lg text-xl font-black tracking-tight text-[#df3c2f] transition-opacity duration-200 hover:opacity-70 active:opacity-50">{settings.store.name.toUpperCase()}</a>
          <div className="hidden text-right text-sm sm:block"><p className="font-bold">Ежедневно {settings.store.opensAt}–{settings.store.closesAt}</p><p className="text-[#706d65]">Заказы: {settings.store.phone}</p></div>
          <button disabled={!count} onClick={() => setCheckoutOpen(true)} className="flex items-center gap-2 rounded-full bg-[#1d1c19] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#35332e] hover:shadow-md active:translate-y-0 active:scale-[0.97] disabled:translate-y-0 disabled:bg-[#d8d2c7] disabled:text-[#77736b] disabled:shadow-none"><ShoppingBag size={18} /><span>{count ? `${count} · ${formatPrice(total)}` : "Корзина"}</span></button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-12 pt-10 md:px-8 md:pt-16">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#1f2925] px-6 py-12 text-white md:px-14 md:py-16">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#df3c2f] opacity-70 blur-2xl" />
          <div className="relative max-w-2xl">
            <p className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-[#ffc9a9]"><Sparkles size={16} /> Готовим после заказа</p>
            <h1 className="text-4xl font-black leading-[1.05] tracking-[-0.04em] sm:text-6xl">Роллы, ради которых хочется остаться дома</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/70 md:text-lg">Свежие ингредиенты, щедрые порции и доставка по {settings.delivery.name}. Минимальный заказ — {formatPrice(settings.delivery.minimumOrder)}.</p>
            {!settings.ordering.acceptingOrders && <p className="mt-5 inline-flex rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-amber-950">Приём заказов временно приостановлен</p>}
            <a href="#menu" className="group mt-8 inline-flex items-center gap-2 rounded-full bg-[#df3c2f] px-6 py-3.5 font-extrabold shadow-lg shadow-red-950/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#ee4a3d] hover:shadow-xl hover:shadow-red-950/25 active:translate-y-0 active:scale-[0.98]">Выбрать роллы <ChevronRight className="transition-transform duration-200 group-hover:translate-x-0.5" size={19} /></a>
          </div>
        </div>
      </section>

      <section id="menu" className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="mb-7 flex min-w-0 flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="shrink-0"><p className="text-sm font-bold uppercase tracking-[0.18em] text-[#df3c2f]">Меню</p><h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Что будем заказывать?</h2></div>
          <nav className="flex min-w-0 flex-wrap gap-2 pb-1 md:flex-1 md:justify-end" aria-label="Категории меню">
            {catalog.categories.map((category) => <button key={category.id} onClick={() => setActiveCategory(category.id)} className={`whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] ${activeCategory === category.id ? "bg-[#1d1c19] text-white shadow-md" : "border border-[#e2dacd] bg-white/60 hover:border-[#cfc3b3] hover:bg-white hover:shadow-sm"}`}>{category.name}</button>)}
          </nav>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <article key={product.id} tabIndex={0} onClick={() => setSelectedProduct(product)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedProduct(product); } }} className="group flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-[#e7e0d4] bg-[#fffdf8] shadow-[0_12px_35px_rgba(44,38,28,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-[#d8cdbd] hover:shadow-[0_18px_45px_rgba(44,38,28,0.11)] focus:outline-none focus:ring-2 focus:ring-[#df3c2f] focus:ring-offset-2">
              <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-gradient-to-br from-[#f4c3a2] via-[#e46c52] to-[#87352c]">
                {product.imageUrl ? <Image src={product.imageUrl} alt={product.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="h-32 w-32 rounded-full border-[16px] border-[#f7eee4] bg-[#dd614d] shadow-2xl transition-transform duration-500 group-hover:scale-105 group-hover:rotate-2"><div className="m-auto mt-5 h-14 w-14 rounded-full bg-[#8eb66b]" /></div>}
                <div className="absolute left-4 top-4 flex gap-2">{product.badges.map((badge) => <span key={badge} className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-[#b92d24] shadow-sm">{badge}</span>)}</div>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3"><h3 className="text-xl font-extrabold">{product.name}</h3><span className="shrink-0 text-sm text-[#706d65]">{product.weightGrams} г</span></div>
                <p className="mt-2 flex-1 text-sm leading-6 text-[#706d65]">{product.description}</p>
                <div className="mt-5 flex items-center justify-between">
                  <strong className="text-xl">{formatPrice(product.price)}</strong>
                  {cart[product.id] ? <div className="flex items-center gap-3 rounded-full bg-[#1d1c19] p-1 text-white shadow-sm" onClick={(event) => event.stopPropagation()}><button aria-label="Уменьшить" onClick={() => changeQuantity(product, -1)} className="cursor-pointer rounded-full p-2 transition-all duration-150 hover:bg-white/15 active:scale-90"><Minus size={16} /></button><span className="min-w-4 text-center text-sm font-extrabold">{cart[product.id]}</span><button aria-label="Увеличить" onClick={() => changeQuantity(product, 1)} className="cursor-pointer rounded-full p-2 transition-all duration-150 hover:bg-white/15 active:scale-90"><Plus size={16} /></button></div> : <button disabled={!settings.ordering.acceptingOrders} onClick={(event) => { event.stopPropagation(); changeQuantity(product, 1); }} className="cursor-pointer rounded-full bg-[#df3c2f] px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#ee4a3d] hover:shadow-md active:translate-y-0 active:scale-[0.96] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none">В корзину</button>}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {count > 0 && <div className="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-[calc(100%-2rem)] max-w-lg items-center justify-between rounded-2xl bg-[#1d1c19] p-3 pl-5 text-white shadow-2xl"><div><p className="text-xs text-white/60">{count} позиций</p><p className="font-extrabold">{formatPrice(total)}</p></div><button onClick={() => setCheckoutOpen(true)} className="rounded-xl bg-[#df3c2f] px-5 py-3 text-sm font-extrabold shadow-sm transition-all duration-200 hover:bg-[#ee4a3d] hover:shadow-md active:scale-[0.96]">Оформить заказ</button></div>}
      {selectedProduct && <ProductDetailsDialog product={selectedProduct} canOrder={settings.ordering.acceptingOrders} onClose={() => setSelectedProduct(undefined)} onAdd={() => { changeQuantity(selectedProduct, 1); setSelectedProduct(undefined); }} />}
      <CheckoutDialog open={checkoutOpen} products={catalog.products} quantities={cart} extraGroups={extraGroups} deliveryPrice={settings.delivery.deliveryPrice} freeDeliveryFrom={settings.delivery.freeDeliveryFrom} onQuantityChange={changeQuantity} onClose={() => setCheckoutOpen(false)} onCompleted={() => setCart({})} />
    </main>
  );
}
