"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bike, Clock3, MapPin, Phone, Store } from "lucide-react";
import type { OrderStatus } from "../domain/order";

export type BoardOrder = {
  id: string;
  number: number;
  status: OrderStatus;
  fulfillment: "delivery" | "pickup";
  customerName: string;
  customerPhone: string;
  address: string | null;
  comment: string | null;
  total: number;
  createdAt: string;
  estimatedReadyAt: string;
  items: Array<{ name: string; quantity: number }>;
};

const columns = [
  { id: "queue", label: "Очередь", hint: "Нужно принять", statuses: ["new", "confirmed"] as OrderStatus[], color: "bg-amber-400" },
  { id: "cooking", label: "Готовятся", hint: "На кухне", statuses: ["cooking"] as OrderStatus[], color: "bg-orange-500" },
  { id: "ready", label: "Готовы", hint: "Ждут выдачи", statuses: ["ready"] as OrderStatus[], color: "bg-emerald-500" },
  { id: "delivery", label: "В пути", hint: "У курьера", statuses: ["delivering"] as OrderStatus[], color: "bg-sky-500" },
];

const formatPrice = (kopecks: number) => `${new Intl.NumberFormat("ru-RU").format(kopecks / 100)} ₽`;

function nextAction(order: BoardOrder): { status: OrderStatus; label: string } {
  if (order.status === "new") return { status: "confirmed", label: "Принять" };
  if (order.status === "confirmed") return { status: "cooking", label: "Начать готовить" };
  if (order.status === "cooking") return { status: "ready", label: "Заказ готов" };
  if (order.status === "ready" && order.fulfillment === "delivery") return { status: "delivering", label: "Передать курьеру" };
  if (order.status === "ready") return { status: "completed", label: "Выдать заказ" };
  return { status: "completed", label: "Доставлено" };
}

export function OrdersBoard({ initialOrders }: { initialOrders: BoardOrder[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [now, setNow] = useState(() => Date.now());
  const [pendingId, setPendingId] = useState<string>();
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 30_000);
    const refresh = window.setInterval(() => startTransition(() => router.refresh()), 15_000);
    return () => { window.clearInterval(clock); window.clearInterval(refresh); };
  }, [router]);

  const grouped = useMemo(() => Object.fromEntries(columns.map((column) => [column.id, orders.filter((order) => column.statuses.includes(order.status))])), [orders]);

  async function changeStatus(order: BoardOrder, status: OrderStatus) {
    setPendingId(order.id);
    setError("");
    const response = await fetch(`/api/admin/orders/${order.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const payload = await response.json();
    if (!response.ok) setError(payload.error ?? "Не удалось изменить статус.");
    else setOrders((current) => status === "completed" || status === "cancelled" ? current.filter((item) => item.id !== order.id) : current.map((item) => item.id === order.id ? { ...item, status } : item));
    setPendingId(undefined);
  }

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#df3c2f]">Кухня и выдача</p><h1 className="mt-1 text-3xl font-black tracking-tight">Текущие заказы</h1><p className="mt-2 text-sm text-zinc-500">Доска обновляется автоматически каждые 15 секунд</p></div><div className="rounded-xl bg-white px-4 py-2 text-sm font-bold shadow-sm">В работе: {orders.length}</div></div>
      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
      <div className="grid items-start gap-4 xl:grid-cols-4">
        {columns.map((column) => (
          <section key={column.id} className="min-w-0 rounded-2xl bg-[#e9eaec] p-3">
            <header className="mb-3 flex items-center justify-between px-1"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${column.color}`} /><div><h2 className="font-black">{column.label}</h2><p className="text-xs text-zinc-500">{column.hint}</p></div></div><span className="rounded-full bg-white px-2.5 py-1 text-xs font-black">{grouped[column.id].length}</span></header>
            <div className="space-y-3">
              {grouped[column.id].map((order: BoardOrder) => {
                const target = new Date(order.estimatedReadyAt);
                const minutes = Math.ceil((target.getTime() - now) / 60_000);
                const action = nextAction(order);
                return <article key={order.id} className={`rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md ${minutes < 0 ? "border-red-300" : "border-black/5"}`}>
                  <div className="flex items-start justify-between"><div><p className="text-2xl font-black">#{order.number}</p><p className="mt-0.5 text-xs text-zinc-500">{new Date(order.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</p></div><div className={`rounded-lg px-2.5 py-1.5 text-right text-xs font-black ${minutes < 0 ? "bg-red-100 text-red-700" : minutes <= 10 ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}><Clock3 className="mr-1 inline" size={13} />{minutes < 0 ? `Опоздание ${Math.abs(minutes)} мин` : `К ${target.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`}</div></div>
                  <ul className="my-4 space-y-2 border-y border-zinc-100 py-3 text-sm">{order.items.map((item, index) => <li key={`${item.name}-${index}`} className="flex gap-2"><b className="min-w-5">{item.quantity}×</b><span>{item.name}</span></li>)}</ul>
                  <div className="space-y-1.5 text-xs text-zinc-500"><p className="flex items-center gap-2 font-bold text-zinc-800">{order.fulfillment === "delivery" ? <Bike size={15} /> : <Store size={15} />}{order.fulfillment === "delivery" ? "Доставка" : "Самовывоз"}</p>{order.address && <p className="flex items-start gap-2"><MapPin className="mt-0.5 shrink-0" size={14} />{order.address}</p>}<p className="flex items-center gap-2"><Phone size={14} />{order.customerPhone}</p>{order.comment && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-amber-900">{order.comment}</p>}</div>
                  <div className="mt-4 flex items-center justify-between"><b>{formatPrice(order.total)}</b><div className="flex gap-2"><button disabled={pendingId === order.id} onClick={() => changeStatus(order, "cancelled")} className="rounded-lg px-2 py-2 text-xs font-bold text-zinc-400 transition hover:bg-red-50 hover:text-red-700">Отмена</button><button disabled={pendingId === order.id} onClick={() => changeStatus(order, action.status)} className="rounded-xl bg-[#20221f] px-3 py-2 text-xs font-black text-white transition hover:bg-[#3a3d38] active:scale-95 disabled:opacity-50">{pendingId === order.id ? "…" : action.label}</button></div></div>
                </article>;
              })}
              {!grouped[column.id].length && <div className="rounded-xl border border-dashed border-zinc-300 px-3 py-8 text-center text-xs text-zinc-400">Заказов нет</div>}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
