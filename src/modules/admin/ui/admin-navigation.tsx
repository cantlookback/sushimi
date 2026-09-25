"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, ContactRound, Settings2, UtensilsCrossed, Wheat } from "lucide-react";

const items = [
  { href: "/admin/orders", label: "Заказы", Icon: ClipboardList },
  { href: "/admin/customers", label: "Клиенты", Icon: ContactRound },
  { href: "/admin/analytics", label: "Статистика", Icon: BarChart3 },
  { href: "/admin/catalog", label: "Меню", Icon: UtensilsCrossed },
  { href: "/admin/ingredients", label: "Ингредиенты", Icon: Wheat },
  { href: "/admin/settings", label: "Настройки", Icon: Settings2 },
];

export function AdminNavigation() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Разделы CRM">
      {items.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href);
        return <Link key={href} href={href} className={`flex min-w-fit items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-200 lg:w-full ${active ? "bg-[#20221f] text-white shadow-md" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"}`}><Icon size={19} /><span>{label}</span></Link>;
      })}
    </nav>
  );
}
