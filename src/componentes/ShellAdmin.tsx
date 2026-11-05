"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, House, Leaf, Star, Tag } from "lucide-react";
import { EMPRESA } from "../data/empresa";
import { TEXTOS_INICIO } from "../data/inicioAdmin";
import { ProveedorPeriodoAdmin, usePeriodoAdmin } from "./PeriodoAdmin";
const NAV = [
  { href: "/admin", etiqueta: "Inicio", icono: House },
  { href: "/admin/ventas", etiqueta: "Ventas", icono: Tag },
  { href: "/admin/resenas", etiqueta: "Reseñas", icono: Star },
];
function ContenidoShell({ children }: { children: React.ReactNode }) {
  const ruta = usePathname().replace(/\/$/, "");
  const { periodo, setPeriodo } = usePeriodoAdmin();
  return <div className="admin-shell">
    <header className="border-b border-stone bg-superficie/70">
      <div className="admin-barra mx-auto w-full max-w-admin px-4 sm:px-6 lg:px-12">
        <Link href="/admin" className="flex shrink-0 items-center gap-3 font-titulos text-h4 text-coffee no-underline lg:text-h2">
          <Leaf aria-hidden="true" className="size-7 text-olivo-admin" strokeWidth={1.5} />{EMPRESA.marca}
        </Link>
        <nav aria-label="Administración" className="flex items-stretch gap-5 sm:gap-8">
          {NAV.map(({ href, etiqueta, icono: Icono }) => {
            const activa = ruta === href || (href !== "/admin" && ruta.startsWith(href));
            return <Link key={href} href={href} aria-current={activa ? "page" : undefined}
              className={`flex min-h-12 items-center gap-2 border-b-2 text-small no-underline ${activa ? "border-olivo-admin text-coffee" : "border-transparent text-tinta-suave hover:text-coffee"}`}>
              <Icono aria-hidden="true" className="size-5" strokeWidth={1.6} />{etiqueta}
            </Link>;
          })}
        </nav>
        {ruta === "/admin" && <label className="admin-periodo flex min-h-11 items-center gap-2 text-small text-tinta-suave">
          <CalendarDays aria-hidden="true" className="size-4 shrink-0" /><span className="sr-only">{TEXTOS_INICIO.periodo}</span>
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="min-h-11 max-w-full cursor-pointer rounded-sm bg-superficie px-2 text-small text-coffee">
            {TEXTOS_INICIO.periodos.map((p) => <option key={p.valor} value={p.valor}>{p.etiqueta}</option>)}
          </select>
        </label>}
      </div>
    </header>
    <main className="mx-auto w-full max-w-admin px-4 py-6 sm:px-6 lg:px-12">{children}</main>
  </div>;
}
export default function ShellAdmin({ children }: { children: React.ReactNode }) {
  return <ProveedorPeriodoAdmin><ContenidoShell>{children}</ContenidoShell></ProveedorPeriodoAdmin>;
}
