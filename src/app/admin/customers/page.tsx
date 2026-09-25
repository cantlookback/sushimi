import { Crown, Phone, Repeat2, Search } from "lucide-react";
import { getCustomers } from "@/modules/customers/application/get-customers";

export const metadata = { title: "Клиенты" };
export const dynamic = "force-dynamic";
const formatPrice = (kopecks: number) => `${new Intl.NumberFormat("ru-RU").format(kopecks / 100)} ₽`;

export default async function CustomersPage() {
  const customers = await getCustomers();
  const repeatCount = customers.filter((customer) => customer.ordersCount > 1).length;
  const vipCount = customers.filter((customer) => customer.totalSpent >= 500000).length;
  return <div>
    <div className="mb-6"><p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#df3c2f]">База покупателей</p><h1 className="mt-1 text-3xl font-black tracking-tight">Клиенты</h1><p className="mt-2 text-sm text-zinc-500">Собирается автоматически по номеру телефона из заказов</p></div>
    <section className="mb-5 grid gap-3 sm:grid-cols-3">
      {[{ Icon: Phone, label: "Всего клиентов", value: customers.length }, { Icon: Repeat2, label: "Повторные", value: repeatCount }, { Icon: Crown, label: "VIP от 5 000 ₽", value: vipCount }].map(({ Icon, label, value }) => <article key={label} className="rounded-2xl bg-white p-5 shadow-sm"><Icon className="mb-4 text-[#df3c2f]" size={21} /><p className="text-sm text-zinc-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></article>)}
    </section>
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-100 p-5"><h2 className="font-black">Покупатели</h2><span className="flex items-center gap-2 text-xs text-zinc-400"><Search size={15} /> Поиск добавим вместе с пагинацией</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-zinc-50 text-zinc-500"><tr>{["Клиент", "Телефон", "Заказов", "Потрачено", "Средний чек", "Последний заказ", "Сегмент"].map((heading) => <th key={heading} className="px-5 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody>
        {customers.map((customer) => <tr key={customer.phone} className="border-t border-zinc-100 transition hover:bg-[#fff9f5]"><td className="px-5 py-4 font-bold">{customer.name}</td><td className="px-5 py-4 text-zinc-500">{customer.phone}</td><td className="px-5 py-4">{customer.ordersCount}</td><td className="px-5 py-4 font-bold">{formatPrice(customer.totalSpent)}</td><td className="px-5 py-4">{formatPrice(customer.averageCheck)}</td><td className="px-5 py-4 text-zinc-500">{new Date(customer.lastOrderAt).toLocaleDateString("ru-RU")}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${customer.totalSpent >= 500000 ? "bg-amber-100 text-amber-800" : customer.ordersCount > 1 ? "bg-violet-100 text-violet-700" : "bg-zinc-100 text-zinc-600"}`}>{customer.totalSpent >= 500000 ? "VIP" : customer.ordersCount > 1 ? "Постоянный" : "Новый"}</span></td></tr>)}
      </tbody></table></div>
    </section>
  </div>;
}
