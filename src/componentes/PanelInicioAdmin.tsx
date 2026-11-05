"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Banknote, ChartNoAxesColumn, CheckCircle2, ChevronRight, Clock3, Coins, CreditCard, Leaf, Mail, MessageCircle, Plus, ShoppingBag, Star, Store, Tag, Truck, Zap, type LucideIcon } from "lucide-react";
import { centavosAPesos, fechaMX, folioVisible, leerInicio, type ResumenInicio } from "../lib/ventasAdmin";
import { periodoInicio, saludoInicio } from "../lib/inicioAdmin";
import { TEXTOS_INICIO as T } from "../data/inicioAdmin";
import { ETIQUETAS_CANAL, ETIQUETAS_ENTREGA, ETIQUETAS_PAGO } from "../data/ventas";
import { usePeriodoAdmin } from "./PeriodoAdmin";
import GraficaVentasAdmin from "./GraficaVentasAdmin";
import FormularioVenta from "./FormularioVenta";
import ResumenCostosAdmin from "./ResumenCostosAdmin";

const CANALES: Record<string, LucideIcon> = { whatsapp: MessageCircle, instagram: MessageCircle, facebook: MessageCircle, presencial: Store, correo: Mail, otro: Tag };
const suscribirReloj = () => () => {};
const saludoServidor = () => T.saludos[0];
function Titulo({ icono: Icono, children, id }: { icono: LucideIcon; children: React.ReactNode; id?: string }) {
  return <h2 id={id} className="flex items-center gap-3 font-titulos text-h4 text-coffee"><Icono aria-hidden="true" className="size-5 shrink-0 text-honey-profundo" strokeWidth={1.6} />{children}</h2>;
}
function Estado({ bueno, children }: { bueno: boolean; children: React.ReactNode }) {
  return <span className={`inline-block whitespace-nowrap rounded-sm px-2 py-1 text-label tracking-normal ${bueno ? "bg-origen-claro text-origen" : "bg-honey/10 text-honey-texto"}`}>{children}</span>;
}
export default function PanelInicioAdmin() {
  const saludo = useSyncExternalStore(suscribirReloj, saludoInicio, saludoServidor);
  const { periodo } = usePeriodoAdmin();
  const { desde, hasta } = periodoInicio(periodo);
  const [respuesta, setRespuesta] = useState<{ clave: string; datos?: ResumenInicio; error?: "noAuth" | "error" } | null>(null);
  const [revision, setRevision] = useState(0);
  const [formulario, setFormulario] = useState(false);
  const [aviso, setAviso] = useState(false);
  const clave = `${desde}/${hasta}/${revision}`;
  useEffect(() => {
    let activo = true;
    void leerInicio(desde, hasta).then((r) => {
      if (activo) setRespuesta(r.ok ? { clave, datos: r.datos } : { clave, error: r.noAutorizado ? "noAuth" : "error" });
    });
    return () => { activo = false; };
  }, [desde, hasta, clave]);
  const datos = respuesta?.clave === clave ? respuesta.datos : undefined;
  const error = respuesta?.clave === clave ? respuesta.error : undefined;
  const metricas = datos ? [
    { icono: ShoppingBag, etiqueta: T.ventas, valor: centavosAPesos(datos.ventasCentavos), detalle: `${datos.cantidadVentas} ${datos.cantidadVentas === 1 ? "venta" : "ventas"}` },
    { icono: CreditCard, etiqueta: T.cobrado, valor: centavosAPesos(datos.cobradoCentavos), detalle: `${centavosAPesos(datos.porCobrarCentavos)} por cobrar` },
    { icono: Coins, etiqueta: T.ganancia, valor: datos.ventasConCosto > 0 ? centavosAPesos(datos.gananciaEstimadaCentavos) : "—", detalle: datos.ventasSinCosto > 0 || datos.ventasLegado > 0 ? T.faltanCostos : datos.ventasConCosto > 0 ? T.costos : T.faltanCostos },
    { icono: Star, etiqueta: T.resenas, valor: String(datos.resenasPendientes), detalle: T.global },
  ] : [];
  const filas = datos ? [
    { icono: CreditCard, etiqueta: T.cobros, valor: datos.cobrosPendientes, href: "/admin/ventas" },
    { icono: Truck, etiqueta: T.porEntregar, valor: datos.porEntregar, href: "/admin/ventas" },
    { icono: CheckCircle2, etiqueta: T.entregados, valor: datos.entregados, href: "/admin/ventas" },
    { icono: Star, etiqueta: T.resenas, valor: datos.resenasPendientes, href: "/admin/resenas" },
  ] : [];
  return <div className="admin-inicio">
    <section aria-labelledby="saludo-admin">
      <p className="mb-1 text-label uppercase text-tinta-suave">{T.resumen}</p>
      <h1 id="saludo-admin" className="font-titulos text-h2">{saludo}</h1>
      <p className="mt-1 text-small text-tinta-suave">{T.descripcion}</p>
    </section>
    {!datos ? <div className="admin-tarjeta py-10" role={error ? "alert" : "status"}>
      <p className={error ? "text-alerta" : "text-tinta-suave"}>{error === "noAuth" ? T.noAuth : error ? T.error : T.cargando}</p>
      {error === "error" && <button className="mt-3 min-h-11 rounded-sm border border-stone px-4 text-small" onClick={() => setRevision((n) => n + 1)}>{T.reintentar}</button>}
    </div> : <>
      <section aria-label={T.resumen} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metricas.map(({ icono: Icono, etiqueta, valor, detalle }) => <article key={etiqueta} className="admin-tarjeta admin-metrica flex items-start gap-4">
          <Icono aria-hidden="true" className="mt-1 size-6 shrink-0 text-honey-profundo" strokeWidth={1.6} />
          <div className="min-w-0"><h2 className="font-cuerpo text-label font-normal uppercase tracking-normal text-tinta-suave">{etiqueta}</h2>
            <p className="cifras my-1 break-words font-titulos text-h2">{valor}</p><p className="text-small text-tinta-suave">{detalle}</p></div>
        </article>)}
      </section>
      <div className="admin-central">
        <section className="admin-tarjeta admin-panel-grafica" aria-labelledby="titulo-grafica">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><Titulo icono={ChartNoAxesColumn} id="titulo-grafica">{T.grafica}</Titulo><p className="ml-8 mt-1 text-label tracking-normal text-tinta-suave">{T.graficaDetalle}</p></div>
            <span className="cifras rounded-sm bg-origen-claro px-3 py-1 text-label tracking-normal text-origen">Total: {centavosAPesos(datos.ventasCentavos)}</span>
          </div>
          <GraficaVentasAdmin key={clave} puntos={datos.ventasPorDia} cantidad={datos.cantidadVentas} />
        </section>
        <section className="admin-tarjeta" aria-labelledby="titulo-revisar">
          <Titulo icono={Banknote} id="titulo-revisar">{T.revisar}</Titulo>
          <ul className="mt-3 divide-y divide-stone border-t border-stone">
            {filas.map(({ icono: Icono, etiqueta, valor, href }) => <li key={etiqueta}><Link href={href} className="flex min-h-11 items-center gap-3 py-2 text-small text-coffee no-underline hover:text-olivo-admin"><Icono aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.6} /><span className="flex-1">{etiqueta}</span><span className="cifras">{valor}</span><ChevronRight aria-hidden="true" className="size-4 shrink-0" /></Link></li>)}
          </ul>
          {!datos.cobrosPendientes && !datos.porEntregar && !datos.resenasPendientes && <p className="mt-3 flex items-center gap-2 rounded-sm border border-origen/10 bg-origen-claro/60 p-3 text-small text-origen"><CheckCircle2 aria-hidden="true" className="size-5 shrink-0" />{T.alDia}</p>}
        </section>
        <section className="admin-tarjeta" aria-labelledby="titulo-acciones">
          <Titulo icono={Zap} id="titulo-acciones">{T.acciones}</Titulo>
          <div className="mt-5 grid gap-3">
            <button type="button" onClick={() => setFormulario(true)} className="admin-accion bg-olivo-admin text-superficie hover:bg-origen"><Plus aria-hidden="true" className="size-5" />{T.registrar}</button>
            <Link href="/admin/ventas" className="admin-accion border border-stone text-coffee hover:bg-pagina"><Tag aria-hidden="true" className="size-5" />{T.verVentas}</Link>
            <Link href="/admin/resenas" className="admin-accion border border-stone text-coffee hover:bg-pagina"><Star aria-hidden="true" className="size-5" />{T.revisarResenas}</Link>
          </div>
        </section>
      </div>
      <div className="admin-inferior">
        <section className="admin-tarjeta min-w-0" aria-labelledby="titulo-recientes">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><Titulo icono={Clock3} id="titulo-recientes">{T.recientes}</Titulo><Link href="/admin/ventas" className="flex min-h-11 items-center gap-2 text-small no-underline">{T.verTodas}<ArrowRight aria-hidden="true" className="size-4" /></Link></div>
          {datos.recientes.length ? <div className="max-w-full overflow-x-auto" role="region" aria-label={T.recientes} tabIndex={0}><table className="admin-recientes w-full text-left text-small tracking-normal">
            <caption className="sr-only">{T.recientes}</caption>
            <thead className="border-y border-stone text-tinta-suave"><tr>{T.columnas.map((col) => <th key={col} scope="col" className="px-2 py-3 text-label font-normal uppercase tracking-normal">{col}</th>)}</tr></thead>
            <tbody className="divide-y divide-stone">{datos.recientes.slice(0, 5).map((venta) => {
              const IconoCanal = CANALES[venta.canal] ?? Tag;
              return <tr key={venta.id}>
                <td className="whitespace-nowrap px-2 py-3"><Link href={`/admin/ventas?venta=${encodeURIComponent(venta.id)}`} className="inline-flex min-h-11 items-center text-coffee underline">{folioVisible(venta.folio)}<span className="sr-only"> · {T.verVentas}</span></Link></td>
                <td className="whitespace-nowrap px-2 py-3">{fechaMX(venta.vendidoEn)}</td>
                <td className="admin-productos px-2 py-3">{venta.itemsResumen || T.sinDetalle}</td>
                <td className="px-2 py-3"><span className="flex items-center gap-1 whitespace-nowrap"><IconoCanal aria-hidden="true" className="size-4 shrink-0 text-olivo-admin" />{ETIQUETAS_CANAL[venta.canal]}</span></td>
                <td className="cifras whitespace-nowrap px-2 py-3">{venta.legado ? "—" : centavosAPesos(venta.totalCentavos)}</td>
                <td className="px-2 py-3"><Estado bueno={venta.estadoEntrega === "entregado"}>{ETIQUETAS_ENTREGA[venta.estadoEntrega]}</Estado></td>
                <td className="px-2 py-3"><Estado bueno={venta.estadoPago === "pagado"}>{ETIQUETAS_PAGO[venta.estadoPago]}</Estado></td>
              </tr>;
            })}</tbody>
          </table></div> : <div className="py-6 text-small text-tinta-suave"><p>{T.sinVentas}</p><button className="mt-3 min-h-11 text-honey-texto underline" onClick={() => setFormulario(true)}>{T.registrar}</button></div>}
        </section>
        <aside className="admin-marca relative isolate overflow-hidden rounded-sm border border-stone">
          <Image src={T.foto} alt={T.fotoAlt} fill sizes="(min-width: 1024px) 320px, 100vw" className="object-cover" />
          <div className="admin-marca-velo absolute inset-0" />
          <div className="relative max-w-[75%] p-6"><p className="font-titulos text-h2">{T.marca}</p><Leaf aria-hidden="true" className="mt-4 size-7 text-olivo-admin" strokeWidth={1.5} /></div>
        </aside>
      </div>
      <ResumenCostosAdmin datos={datos} />
      <div className="text-label tracking-normal text-tinta-suave" role="note">
        <p className="mb-1">{T.alcance}</p>
        <p>{T.gastos} {(datos.ventasSinCosto > 0 || datos.ventasLegado > 0) && T.costosParciales}</p>
        {datos.ventasLegado > 0 && <p className="mt-1">{T.legado}</p>}
      </div>
    </>}
    {aviso && <p role="status" className="text-small text-origen">{T.guardada}</p>}
    {formulario && <FormularioVenta onCerrar={() => setFormulario(false)} onGuardado={() => { setFormulario(false); setAviso(true); setRevision((n) => n + 1); }} />}
  </div>;
}
