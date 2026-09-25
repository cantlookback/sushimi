"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { CheckCircle2, Minus, Plus, ShoppingBag, X } from "lucide-react";
import type { Product } from "@/modules/catalog/domain/product";

type ExtraGroup = { id: string; name: string };
type Props = {
  open: boolean;
  products: Product[];
  quantities: Record<string, number>;
  extraGroups: ExtraGroup[];
  deliveryPrice: number;
  freeDeliveryFrom: number | null;
  onQuantityChange: (product: Product, difference: number) => void;
  onClose: () => void;
  onCompleted: () => void;
};

const formatPrice = (kopecks: number) => `${new Intl.NumberFormat("ru-RU").format(kopecks / 100)} ₽`;

export function CheckoutDialog({ open, products, quantities, extraGroups, deliveryPrice, freeDeliveryFrom, onQuantityChange, onClose, onCompleted }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [orderNumber, setOrderNumber] = useState<number>();
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  const selectedProducts = products.filter((product) => quantities[product.id]);
  const subtotal = selectedProducts.reduce((sum, product) => sum + product.price * quantities[product.id], 0);
  const estimatedDelivery = fulfillment === "delivery" && !(freeDeliveryFrom !== null && subtotal >= freeDeliveryFrom) ? deliveryPrice : 0;
  const total = subtotal + estimatedDelivery;

  if (!open) return null;

  function close() {
    setOrderNumber(undefined); setError(""); onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProducts.length) return setError("Добавьте хотя бы один товар.");
    setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.get("customerName"), phone: form.get("phone"), fulfillment,
          address: fulfillment === "delivery" ? form.get("address") : undefined,
          comment: form.get("comment") || undefined,
          items: selectedProducts.map((product) => ({ productId: product.id, quantity: quantities[product.id] })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Не удалось оформить заказ.");
      setOrderNumber(payload.order.number); onCompleted();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось оформить заказ.");
    } finally { setPending(false); }
  }

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm md:items-center md:p-5" role="dialog" aria-modal="true" aria-label="Корзина и оформление заказа">
    <div className="max-h-[96vh] w-full max-w-6xl overflow-hidden rounded-t-[2rem] bg-[#fffdf8] shadow-2xl md:rounded-[2rem]">
      <div className="flex items-start justify-between border-b border-[#e8e0d4] px-5 py-4 md:px-8 md:py-5">
        <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#df3c2f]">Ваш заказ</p><h2 className="mt-1 text-2xl font-black">{orderNumber ? "Заказ принят" : "Корзина"}</h2></div>
        <button type="button" onClick={close} className="rounded-full bg-black/5 p-2.5 transition hover:rotate-6 hover:bg-black/10 active:scale-90" aria-label="Закрыть"><X size={20}/></button>
      </div>

      {orderNumber ? <div className="px-6 py-16 text-center"><CheckCircle2 className="mx-auto text-emerald-600" size={60}/><p className="mt-5 text-2xl font-black">Спасибо! Заказ №{orderNumber}</p><p className="mt-2 text-[#706d65]">Мы свяжемся с вами для подтверждения.</p><button onClick={close} className="mt-7 rounded-full bg-[#1d1c19] px-6 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#35332e] active:scale-95">Вернуться в меню</button></div> :
      <form onSubmit={submit} className="grid max-h-[calc(96vh-85px)] overflow-y-auto lg:grid-cols-[1.12fr_0.88fr] lg:overflow-hidden">
        <section className="space-y-6 p-5 md:p-8 lg:max-h-[calc(96vh-85px)] lg:overflow-y-auto">
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-lg font-black"><ShoppingBag size={20}/>В корзине</h3>
            <div className="divide-y divide-[#e8e0d4] rounded-2xl border border-[#e8e0d4] bg-white px-4">
              {selectedProducts.map((product) => <div key={product.id} className="flex items-center gap-3 py-3">
                {product.imageUrl ? <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100"><Image src={product.imageUrl} alt="" fill sizes="64px" className="object-cover"/></div> : <div className="grid h-14 w-16 shrink-0 place-items-center rounded-xl bg-orange-50 text-xl">🍣</div>}
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold">{product.name}</p><p className="mt-0.5 text-xs text-[#706d65]">{formatPrice(product.price)}</p></div>
                <div className="flex items-center rounded-full bg-[#f2eee7] p-1"><button type="button" onClick={() => onQuantityChange(product, -1)} className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-white active:scale-90" aria-label={`Уменьшить ${product.name}`}><Minus size={14}/></button><b className="min-w-6 text-center text-sm">{quantities[product.id]}</b><button type="button" onClick={() => onQuantityChange(product, 1)} className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-white active:scale-90" aria-label={`Увеличить ${product.name}`}><Plus size={14}/></button></div>
                <b className="hidden w-20 text-right text-sm sm:block">{formatPrice(product.price * quantities[product.id])}</b>
              </div>)}
              {!selectedProducts.length && <p className="py-8 text-center text-sm text-[#706d65]">Корзина пуста</p>}
            </div>
          </div>

          {extraGroups.map((group) => {
            const extras = products.filter((product) => product.categoryId === group.id);
            if (!extras.length) return null;
            return <div key={group.id}><div className="mb-3 flex items-baseline justify-between gap-3"><h3 className="text-lg font-black">{group.name}</h3><span className="text-xs text-[#706d65]">Можно добавить к заказу</span></div><div className="grid gap-2 sm:grid-cols-2">{extras.map((product) => <div key={product.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#e8e0d4] bg-white p-3 transition hover:border-[#d4c6b4] hover:shadow-sm"><div className="min-w-0"><p className="truncate text-sm font-bold">{product.name}</p><p className="mt-1 text-xs text-[#706d65]">{product.price ? formatPrice(product.price) : "Бесплатно"}</p></div>{quantities[product.id] ? <div className="flex shrink-0 items-center rounded-full bg-[#1d1c19] p-1 text-white"><button type="button" onClick={() => onQuantityChange(product, -1)} className="grid h-7 w-7 place-items-center rounded-full transition hover:bg-white/15 active:scale-90"><Minus size={13}/></button><b className="min-w-5 text-center text-xs">{quantities[product.id]}</b><button type="button" onClick={() => onQuantityChange(product, 1)} className="grid h-7 w-7 place-items-center rounded-full transition hover:bg-white/15 active:scale-90"><Plus size={13}/></button></div> : <button type="button" onClick={() => onQuantityChange(product, 1)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#df3c2f] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#ee4a3d] active:scale-90" aria-label={`Добавить ${product.name}`}><Plus size={17}/></button>}</div>)}</div></div>;
          })}

          <div className="space-y-2 border-t border-[#e8e0d4] pt-4 text-sm"><div className="flex justify-between text-[#706d65]"><span>Товары</span><span>{formatPrice(subtotal)}</span></div><div className="flex justify-between text-[#706d65]"><span>{fulfillment === "delivery" ? "Доставка" : "Самовывоз"}</span><span>{estimatedDelivery ? formatPrice(estimatedDelivery) : "Бесплатно"}</span></div><div className="flex justify-between pt-1 text-xl font-black"><span>Итого</span><span>{formatPrice(total)}</span></div></div>
        </section>

        <section className="border-t border-[#e8e0d4] bg-[#f5f0e7] p-5 md:p-8 lg:max-h-[calc(96vh-85px)] lg:overflow-y-auto lg:border-l lg:border-t-0">
          <h3 className="mb-5 text-lg font-black">Данные для получения</h3><div className="space-y-4">
            <fieldset><legend className="mb-2 text-sm font-bold">Способ получения</legend><div className="grid grid-cols-2 gap-2"><label className="rounded-xl border border-[#ddd5c8] bg-white p-3 text-sm font-bold transition hover:border-[#c5b9a8] has-[:checked]:border-[#df3c2f] has-[:checked]:bg-red-50 has-[:checked]:text-[#a9281f]"><input type="radio" name="fulfillment" value="delivery" checked={fulfillment === "delivery"} onChange={() => setFulfillment("delivery")} className="mr-2 accent-[#df3c2f]"/>Доставка</label><label className="rounded-xl border border-[#ddd5c8] bg-white p-3 text-sm font-bold transition hover:border-[#c5b9a8] has-[:checked]:border-[#df3c2f] has-[:checked]:bg-red-50 has-[:checked]:text-[#a9281f]"><input type="radio" name="fulfillment" value="pickup" checked={fulfillment === "pickup"} onChange={() => setFulfillment("pickup")} className="mr-2 accent-[#df3c2f]"/>Самовывоз</label></div></fieldset>
            <label className="block"><span className="mb-1.5 block text-sm font-bold">Имя</span><input required minLength={2} name="customerName" autoComplete="name" className="w-full cursor-text rounded-xl border border-[#ddd5c8] bg-white px-4 py-3 outline-none transition hover:border-[#c5b9a8] focus:border-[#df3c2f] focus:ring-4 focus:ring-[#df3c2f]/10"/></label>
            <label className="block"><span className="mb-1.5 block text-sm font-bold">Телефон</span><input required minLength={10} name="phone" type="tel" autoComplete="tel" placeholder="+7 900 000-00-00" className="w-full cursor-text rounded-xl border border-[#ddd5c8] bg-white px-4 py-3 outline-none transition hover:border-[#c5b9a8] focus:border-[#df3c2f] focus:ring-4 focus:ring-[#df3c2f]/10"/></label>
            {fulfillment === "delivery" && <label className="block"><span className="mb-1.5 block text-sm font-bold">Адрес доставки</span><input required name="address" autoComplete="street-address" placeholder="Улица, дом, квартира" className="w-full cursor-text rounded-xl border border-[#ddd5c8] bg-white px-4 py-3 outline-none transition hover:border-[#c5b9a8] focus:border-[#df3c2f] focus:ring-4 focus:ring-[#df3c2f]/10"/></label>}
            <label className="block"><span className="mb-1.5 block text-sm font-bold">Комментарий</span><textarea name="comment" rows={3} placeholder="Домофон, подъезд или пожелания" className="w-full cursor-text resize-none rounded-xl border border-[#ddd5c8] bg-white px-4 py-3 outline-none transition hover:border-[#c5b9a8] focus:border-[#df3c2f] focus:ring-4 focus:ring-[#df3c2f]/10"/></label>
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
            <button disabled={pending || !selectedProducts.length} className="w-full rounded-xl bg-[#df3c2f] px-5 py-3.5 font-extrabold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#ee4a3d] hover:shadow-lg active:scale-[0.98] disabled:translate-y-0 disabled:bg-[#c8c2b9] disabled:shadow-none">{pending ? "Оформляем…" : `Оформить за ${formatPrice(total)}`}</button>
            <p className="text-center text-xs leading-5 text-[#706d65]">Итоговую стоимость проверит сервер. {freeDeliveryFrom === null ? `Доставка — ${formatPrice(deliveryPrice)}.` : `Бесплатная доставка от ${formatPrice(freeDeliveryFrom)}.`}</p>
          </div>
        </section>
      </form>}
    </div>
  </div>;
}
