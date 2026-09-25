"use client";

import { FormEvent, useState } from "react";
import { Clock3, MapPinned, Save, Settings2, Store } from "lucide-react";
import type { PlatformSettings } from "../domain/platform-settings";

const inputClass = "w-full cursor-text rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm outline-none transition hover:border-zinc-300 focus:border-[#df3c2f] focus:ring-4 focus:ring-red-500/10";

export function SettingsForm({ initialSettings }: { initialSettings: PlatformSettings }) {
  const [acceptingOrders, setAcceptingOrders] = useState(initialSettings.ordering.acceptingOrders);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string }>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(undefined);
    const data = new FormData(event.currentTarget);
    const rubles = (name: string) => Math.round(Number(data.get(name)) * 100);
    const freeDelivery = String(data.get("freeDeliveryFrom") ?? "").trim();
    const payload: PlatformSettings = {
      store: { name: String(data.get("name")), phone: String(data.get("phone")), address: String(data.get("address")), opensAt: String(data.get("opensAt")), closesAt: String(data.get("closesAt")) },
      ordering: { acceptingOrders, deliveryPreparationMinutes: Number(data.get("deliveryPreparationMinutes")), pickupPreparationMinutes: Number(data.get("pickupPreparationMinutes")) },
      delivery: { zoneId: initialSettings.delivery.zoneId, name: String(data.get("zoneName")), deliveryPrice: rubles("deliveryPrice"), minimumOrder: rubles("minimumOrder"), freeDeliveryFrom: freeDelivery ? Math.round(Number(freeDelivery) * 100) : null },
    };
    const response = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    setMessage(response.ok ? { type: "success", text: "Настройки сохранены и уже применяются." } : { type: "error", text: result.error ?? "Не удалось сохранить настройки." });
    setPending(false);
  }

  return <form onSubmit={submit} className="pb-20">
    <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#df3c2f]">Конфигурация платформы</p><h1 className="mt-1 text-3xl font-black tracking-tight">Настройки</h1><p className="mt-2 text-sm text-zinc-500">Параметры сайта, заказов и доставки</p></div><button disabled={pending} className="flex items-center justify-center gap-2 rounded-xl bg-[#20221f] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#373a35] active:scale-95 disabled:opacity-50"><Save size={17} />{pending ? "Сохраняем…" : "Сохранить"}</button></div>
    {message && <p className={`mb-5 rounded-xl px-4 py-3 text-sm font-bold ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>}
    <div className="grid gap-5 xl:grid-cols-2">
      <SettingsSection Icon={Store} title="Магазин" description="Информация, которую видит клиент">
        <Field label="Название"><input name="name" required defaultValue={initialSettings.store.name} className={inputClass} /></Field>
        <Field label="Телефон"><input name="phone" required defaultValue={initialSettings.store.phone} className={inputClass} /></Field>
        <Field label="Адрес кухни / самовывоза" wide><input name="address" defaultValue={initialSettings.store.address} className={inputClass} /></Field>
        <Field label="Открытие"><input name="opensAt" type="time" required defaultValue={initialSettings.store.opensAt} className={inputClass} /></Field>
        <Field label="Закрытие"><input name="closesAt" type="time" required defaultValue={initialSettings.store.closesAt} className={inputClass} /></Field>
      </SettingsSection>

      <SettingsSection Icon={Clock3} title="Приём заказов" description="Режим работы и обещанное время">
        <div className="col-span-full flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-4"><div><p className="text-sm font-black">Принимать новые заказы</p><p className="mt-1 text-xs text-zinc-500">При отключении API перестанет создавать заказы</p></div><button type="button" role="switch" aria-checked={acceptingOrders} onClick={() => setAcceptingOrders((value) => !value)} className={`relative h-7 w-12 rounded-full transition ${acceptingOrders ? "bg-emerald-600" : "bg-zinc-300"}`}><span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${acceptingOrders ? "translate-x-5" : "translate-x-0"}`} /></button></div>
        <Field label="Готовность доставки, мин"><input name="deliveryPreparationMinutes" type="number" min={10} max={240} required defaultValue={initialSettings.ordering.deliveryPreparationMinutes} className={inputClass} /></Field>
        <Field label="Готовность самовывоза, мин"><input name="pickupPreparationMinutes" type="number" min={10} max={240} required defaultValue={initialSettings.ordering.pickupPreparationMinutes} className={inputClass} /></Field>
      </SettingsSection>

      <SettingsSection Icon={MapPinned} title="Доставка" description="Основная зона и финансовые условия" wide>
        <Field label="Название зоны"><input name="zoneName" required defaultValue={initialSettings.delivery.name} className={inputClass} /></Field>
        <Field label="Стоимость доставки, ₽"><input name="deliveryPrice" type="number" min={0} step="1" required defaultValue={initialSettings.delivery.deliveryPrice / 100} className={inputClass} /></Field>
        <Field label="Минимальный заказ, ₽"><input name="minimumOrder" type="number" min={0} step="1" required defaultValue={initialSettings.delivery.minimumOrder / 100} className={inputClass} /></Field>
        <Field label="Бесплатная доставка от, ₽"><input name="freeDeliveryFrom" type="number" min={0} step="1" defaultValue={initialSettings.delivery.freeDeliveryFrom === null ? "" : initialSettings.delivery.freeDeliveryFrom / 100} placeholder="Не использовать" className={inputClass} /></Field>
      </SettingsSection>

      <section className="rounded-2xl border border-dashed border-zinc-300 bg-white/50 p-5 xl:col-span-2"><div className="flex items-start gap-3"><Settings2 className="mt-0.5 text-zinc-400" size={20} /><div><h2 className="font-black">Следующие настройки</h2><p className="mt-1 text-sm leading-6 text-zinc-500">Способы оплаты, уведомления Telegram/SMS, дополнительные зоны доставки, расписание по дням недели, праздничные дни и печать кухонных чеков добавим по мере подключения соответствующих интеграций.</p></div></div></section>
    </div>
  </form>;
}

function SettingsSection({ Icon, title, description, wide, children }: { Icon: typeof Store; title: string; description: string; wide?: boolean; children: React.ReactNode }) {
  return <section className={`rounded-2xl bg-white p-5 shadow-sm ${wide ? "xl:col-span-2" : ""}`}><header className="mb-5 flex items-start gap-3"><div className="rounded-xl bg-red-50 p-2.5 text-[#df3c2f]"><Icon size={20} /></div><div><h2 className="font-black">{title}</h2><p className="mt-0.5 text-xs text-zinc-400">{description}</p></div></header><div className="grid gap-4 sm:grid-cols-2">{children}</div></section>;
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={wide ? "sm:col-span-2" : ""}><span className="mb-1.5 block text-xs font-bold text-zinc-600">{label}</span>{children}</label>;
}
