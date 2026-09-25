import { Banknote, ReceiptText, Repeat2, ShoppingBag } from "lucide-react";
import { getAnalytics } from "@/modules/analytics/application/get-analytics";

export const metadata = { title: "Статистика" };
export const dynamic = "force-dynamic";
const formatPrice = (kopecks: number) => `${new Intl.NumberFormat("ru-RU").format(kopecks / 100)} ₽`;

export default async function AnalyticsPage() {
  const { summary, topProducts, fulfillment, daily } = await getAnalytics();
  const maxProductQuantity = Math.max(...topProducts.map((product) => product.quantity), 1);
  const maxDailyRevenue = Math.max(...daily.map((day) => day.revenue), 1);
  const fulfillmentTotal = fulfillment.reduce((sum, item) => sum + item.count, 0) || 1;
  const metrics = [
    { Icon: Banknote, label: "Выручка", value: formatPrice(summary.revenue), hint: "За всё время" },
    { Icon: ReceiptText, label: "Средний чек", value: formatPrice(summary.averageCheck), hint: "На один заказ" },
    { Icon: ShoppingBag, label: "Заказов", value: summary.ordersCount, hint: "Всего создано" },
    { Icon: Repeat2, label: "Повторных клиентов", value: summary.repeatCustomers, hint: "Больше одного заказа" },
  ];
  return <div>
    <div className="mb-6"><p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#df3c2f]">Показатели бизнеса</p><h1 className="mt-1 text-3xl font-black tracking-tight">Статистика</h1><p className="mt-2 text-sm text-zinc-500">Сейчас показан весь период; следующим шагом добавим выбор дат</p></div>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ Icon, label, value, hint }) => <article key={label} className="rounded-2xl bg-white p-5 shadow-sm"><Icon className="mb-5 text-[#df3c2f]" size={21} /><p className="text-sm text-zinc-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p><p className="mt-1 text-xs text-zinc-400">{hint}</p></article>)}</section>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <section className="rounded-2xl bg-white p-5 shadow-sm"><div className="mb-6"><h2 className="font-black">Выручка по дням</h2><p className="text-xs text-zinc-400">Выполненные и активные заказы</p></div>{daily.length ? <div className="flex h-56 items-end gap-2 border-b border-zinc-200">{daily.map((day) => <div key={day.day} className="group flex h-full min-w-0 flex-1 flex-col justify-end"><div className="mb-2 hidden text-center text-[10px] font-bold group-hover:block">{formatPrice(day.revenue)}</div><div className="min-h-1 rounded-t-lg bg-[#df3c2f] transition hover:bg-[#ef5145]" style={{ height: `${Math.max(5, day.revenue / maxDailyRevenue * 100)}%` }} /><p className="mt-2 truncate text-center text-[10px] text-zinc-400">{day.day}</p></div>)}</div> : <p className="py-20 text-center text-sm text-zinc-400">Данных пока недостаточно</p>}</section>
      <section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-black">Способ получения</h2><p className="mb-6 text-xs text-zinc-400">Доля всех заказов</p><div className="space-y-5">{fulfillment.map((item) => { const percent = Math.round(item.count / fulfillmentTotal * 100); return <div key={item.type}><div className="mb-2 flex justify-between text-sm"><b>{item.type === "delivery" ? "Доставка" : "Самовывоз"}</b><span>{item.count} · {percent}%</span></div><div className="h-3 overflow-hidden rounded-full bg-zinc-100"><div className="h-full rounded-full bg-[#20221f]" style={{ width: `${percent}%` }} /></div></div>; })}</div></section>
    </div>
    <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm"><div className="mb-6"><h2 className="font-black">Популярные позиции</h2><p className="text-xs text-zinc-400">Что заказывают чаще всего</p></div><div className="space-y-4">{topProducts.map((product, index) => <div key={product.name} className="grid grid-cols-[28px_1fr_auto] items-center gap-3"><span className="text-sm font-black text-zinc-400">{index + 1}</span><div><div className="mb-1.5 flex justify-between gap-3 text-sm"><b>{product.name}</b><span className="text-zinc-500">{product.quantity} шт.</span></div><div className="h-2 overflow-hidden rounded-full bg-zinc-100"><div className="h-full rounded-full bg-[#df3c2f]" style={{ width: `${product.quantity / maxProductQuantity * 100}%` }} /></div></div><b className="text-sm">{formatPrice(product.revenue)}</b></div>)}</div></section>
  </div>;
}
