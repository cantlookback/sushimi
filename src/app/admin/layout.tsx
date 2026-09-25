import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AdminNavigation } from "@/modules/admin/ui/admin-navigation";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-screen bg-[#f3f4f6] text-[#202226]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-black/5 bg-white p-5 lg:flex lg:flex-col">
        <Link href="/admin/orders" className="rounded-lg text-xl font-black tracking-tight"><span className="text-[#df3c2f]">СУШИ</span> CRM</Link>
        <p className="mt-1 text-xs text-zinc-400">Операционная панель</p>
        <div className="mt-8"><AdminNavigation /></div>
        <div className="mt-auto space-y-3">
          <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Демо-режим. Перед публикацией CRM необходимо закрыть авторизацией.</p>
          <Link href="/" target="_blank" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950">Открыть сайт <ExternalLink size={16} /></Link>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-black/5 bg-white/90 px-4 py-3 backdrop-blur-xl lg:hidden"><div className="mb-3 flex items-center justify-between"><Link href="/admin/orders" className="font-black"><span className="text-[#df3c2f]">СУШИ</span> CRM</Link><Link href="/" target="_blank" aria-label="Открыть сайт" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"><ExternalLink size={18} /></Link></div><AdminNavigation /></header>
        <main className="p-4 md:p-7 xl:p-9">{children}</main>
      </div>
    </div>
  );
}
