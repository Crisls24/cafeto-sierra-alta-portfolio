"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, CreditCard, Link2, MessageSquare, Pencil, Truck, XCircle } from "lucide-react";
import CapaModal from "./CapaModal";
import { TEXTOS_IDENTIDAD_RESENA as TI } from "../data/resenas";
import { TEXTOS_VENTAS as T, ETIQUETAS_CANAL, ETIQUETAS_ENTREGA, ETIQUETAS_PAGO, ETIQUETAS_MOLIENDA } from "../data/ventas";
import { centavosAPesos, fechaMX, folioVisible, type VentaAdmin } from "../lib/ventasAdmin";

interface Props {
  venta: VentaAdmin;
  enlace: string | null;
  ocupado: boolean;
  aviso?: string | null;
  error?: string | null;
  onCerrar: () => void;
  onListo: () => void;
  onEntregar: () => void;
  onPago: () => void;
  onSolicitar: () => void;
  onRevocarSolicitar: () => void;
  onCancelar: () => void;
  onEditar: () => void;
  onCopiar: (enlace: string) => void;
}
const PRINCIPAL = "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-olivo-admin px-4 text-small text-superficie hover:bg-origen disabled:opacity-50";
const SECUNDARIO = "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-stone bg-superficie px-4 text-small text-coffee no-underline hover:bg-pagina disabled:opacity-50";

function EtiquetaEstado({ bueno, cancelado, children }: { bueno: boolean; cancelado?: boolean; children: React.ReactNode }) {
  const Icono = cancelado ? XCircle : bueno ? CheckCircle2 : Clock3;
  return <span className={`inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-small ${cancelado ? "bg-stone text-tinta-suave" : bueno ? "bg-origen-claro text-origen" : "bg-honey/10 text-honey-texto"}`}>
    <Icono aria-hidden="true" className="size-4 shrink-0" />{children}
  </span>;
}

export default function DetalleVenta({ venta, enlace, ocupado, aviso, error, onCerrar, onListo, onEntregar, onPago, onSolicitar, onRevocarSolicitar, onCancelar, onEditar, onCopiar }: Props) {
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const volverRef = useRef<HTMLButtonElement>(null);
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const entregado = venta.estadoEntrega === "entregado";
  const cancelado = venta.estadoEntrega === "cancelado";
  const pagado = venta.estadoPago === "pagado";
  const puedeSolicitar = entregado && !cancelado && ["sin_solicitar", "revocada", "expirada"].includes(venta.resenaEstado);
  const puedeEditar = venta.totalReportadoCentavos === null && !entregado && !cancelado && venta.items.every((it) => it.productoId && it.presentacionId);
  const invitacionActiva = venta.invitacion?.estado === "activa" && venta.resenaEstado !== "pendiente";
  const importe = venta.legado ? "—" : centavosAPesos(venta.totalCentavos);
  function cerrar() { if (!ocupado) onCerrar(); }

  return <CapaModal centrado ocupado={ocupado} titulo={`${T.detalle.titulo} ${folioVisible(venta.folio)}`} descripcion={`${fechaMX(venta.vendidoEn)} · ${ETIQUETAS_CANAL[venta.canal]}`} onCerrar={cerrar}>
    <div className="venta-formulario">
      <div className="venta-formulario-cuerpo">
        {aviso && <p role="status" className="mb-4 rounded-sm border border-origen/10 bg-origen-claro/60 p-3 text-small text-origen">{aviso}</p>}
        {error && <p role="alert" className="mb-4 rounded-sm border border-alerta/20 bg-alerta/5 p-3 text-small text-alerta">{error}</p>}
        {ocupado && <p role="status" className="mb-4 text-small text-tinta-suave">{T.detalle.procesando}</p>}
        <div className="mb-4 flex flex-wrap gap-3 text-small text-tinta-suave">
          {venta.ventaVendedora && <span className="text-olivo-admin">{T.detalle.vendedora}</span>}
          {venta.fechaAproximada && <span>{T.detalle.fechaAproximada}</span>}
          {venta.totalReportadoCentavos !== null && <span>{T.detalle.desglosePendiente}</span>}
          {venta.porPaqueteria && <span>{T.detalle.envio}: {centavosAPesos(venta.envioCentavos)}</span>}
        </div>
        <section aria-labelledby="detalle-productos">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 id="detalle-productos" className="font-titulos text-h4 font-medium">{T.detalle.productos}</h3>
            {puedeEditar && <button type="button" onClick={onEditar} disabled={ocupado} className={SECUNDARIO}><Pencil aria-hidden="true" className="size-4" />{T.acciones.editar}</button>}
          </div>
          {venta.items.length ? <ul className="divide-y divide-stone border-y border-stone">
            {venta.items.map((item) => <li key={item.id} className="flex items-start justify-between gap-4 py-4">
              <div className="min-w-0"><p className="break-words text-small font-medium">{item.cantidad} × {item.nombreProducto} · {item.nombrePresentacion}</p>
                {item.molienda && <p className="mt-1 text-small text-tinta-suave">{ETIQUETAS_MOLIENDA[item.molienda]}</p>}
              </div>
              <p className="cifras shrink-0 text-small font-medium">{item.subtotalCentavos === null ? T.precioPendiente : centavosAPesos(item.subtotalCentavos)}</p>
            </li>)}
          </ul> : <p className="border-y border-stone py-4 text-small text-tinta-suave">{T.detalle.ventaHistorica}</p>}
        </section>

        <section aria-label={`${T.detalle.entrega} / ${T.detalle.pago}`} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col items-start gap-3 rounded-sm border border-stone p-4">
            <h3 className="flex items-center gap-2 text-small font-medium"><Truck aria-hidden="true" className="size-5 text-olivo-admin" />{T.detalle.entrega}</h3>
            <EtiquetaEstado bueno={entregado} cancelado={cancelado}>{ETIQUETAS_ENTREGA[venta.estadoEntrega]}</EtiquetaEstado>
            {venta.entregadoEn && <p className="text-small text-tinta-suave">{T.detalle.fechaEntrega}: <span className="text-coffee">{fechaMX(venta.entregadoEn.slice(0, 10))}</span></p>}
            {venta.estadoEntrega === "por_preparar" && <button type="button" onClick={onListo} disabled={ocupado} className={`${SECUNDARIO} mt-auto`}>{T.acciones.listo}</button>}
            {venta.estadoEntrega === "listo" && <button type="button" onClick={onEntregar} disabled={ocupado} className={`${PRINCIPAL} mt-auto`}>{T.acciones.entregado}</button>}
          </div>
          <div className="flex min-w-0 flex-col items-start gap-3 rounded-sm border border-stone p-4">
            <h3 className="flex items-center gap-2 text-small font-medium"><CreditCard aria-hidden="true" className="size-5 text-olivo-admin" />{T.detalle.pago}</h3>
            <EtiquetaEstado bueno={pagado}>{ETIQUETAS_PAGO[venta.estadoPago]}</EtiquetaEstado>
            {entregado && !pagado && !cancelado && <button type="button" onClick={onPago} disabled={ocupado} className={`${PRINCIPAL} mt-auto`}>{T.acciones.pagar}</button>}
          </div>
        </section>

        <section className="mt-5 border-t border-stone pt-5" aria-labelledby="detalle-nota">
          <h3 id="detalle-nota" className="font-titulos text-h4 font-medium">{T.detalle.nota}</h3>
          <p className={`mt-2 break-words text-small ${venta.referencia?.trim() ? "text-coffee" : "text-tinta-suave"}`}>{venta.referencia?.trim() || T.detalle.sinNota}</p>
        </section>

        {((entregado && !cancelado) || ["pendiente", "publicada", "rechazada"].includes(venta.resenaEstado)) && <section className="mt-5 border-t border-stone pt-5" aria-labelledby="detalle-resena">
          <h3 id="detalle-resena" className="flex items-center gap-2 font-titulos text-h4 font-medium"><MessageSquare aria-hidden="true" className="size-5 text-olivo-admin" />{T.detalle.resena}</h3>
          <div className="mt-3 grid justify-items-start gap-3">
            {venta.invitacion?.estado === "activa" && !["pendiente", "publicada", "rechazada"].includes(venta.resenaEstado) && <p className="text-small text-tinta-suave">{TI.vence}: {fechaMX(venta.invitacion.expiraEn)}</p>}
            {["pendiente", "publicada", "rechazada"].includes(venta.resenaEstado) && <Link href={`/admin/resenas?venta=${encodeURIComponent(venta.id)}&estado=${venta.resenaEstado === "publicada" ? "aprobada" : venta.resenaEstado === "rechazada" ? "rechazada" : "pendiente"}`} className={SECUNDARIO}>{TI.detalle}</Link>}
            {venta.resenaEstado === "pendiente" && <><p className="text-small text-tinta-suave">{T.detalle.resenaPendiente}</p><Link href="/admin/resenas" className={SECUNDARIO}>{T.acciones.revisarResenas}</Link></>}
            {(venta.resenaEstado === "publicada" || venta.resenaEstado === "rechazada") && <p className="text-small text-tinta-suave">{venta.resenaEstado === "publicada" ? T.detalle.resenaPublicada : T.detalle.resenaRechazada}</p>}
            {invitacionActiva && !enlace && <><p className="text-small text-tinta-suave">{TI.enlaceUnaVez}</p><button type="button" onClick={() => { if (window.confirm(TI.renovacion)) onRevocarSolicitar(); }} disabled={ocupado} className={SECUNDARIO}>{TI.regenerar}</button></>}
            {puedeSolicitar && !enlace && <><p className="text-small text-tinta-suave">{T.detalle.sinSolicitud}</p><button type="button" onClick={onSolicitar} disabled={ocupado} className={PRINCIPAL}><Link2 aria-hidden="true" className="size-4" />{venta.resenaEstado === "expirada" ? TI.renovar : T.acciones.solicitarResena}</button></>}
            {enlace && <div className="grid w-full min-w-0 gap-3 rounded-sm border border-origen/10 bg-origen-claro/40 p-4">
              <p className="text-small text-tinta-suave">{T.detalle.enlaceAviso}</p>
              <label className="grid min-w-0 gap-2 text-small">{T.detalle.enlaceTitulo}<input readOnly value={enlace} className="min-h-11 w-full min-w-0 rounded-sm border border-stone bg-superficie px-3 text-small text-coffee" /></label>
              <div className="flex flex-wrap gap-2"><button type="button" onClick={() => onCopiar(enlace)} disabled={ocupado} className={PRINCIPAL}>{T.acciones.copiar}</button><a href={enlace} target="_blank" rel="noopener noreferrer" className={SECUNDARIO}>{T.acciones.abrir}</a></div>
            </div>}
          </div>
        </section>}

        {confirmarCancelar && !cancelado && <div role="alert" className="mt-5 rounded-sm border border-alerta/30 bg-alerta/5 p-4">
          <p className="text-small font-medium">{T.detalle.confirmarCancelacion}</p><p className="mt-1 text-small text-tinta-suave">{T.detalle.avisoCancelacion}</p>
          <div className="mt-3 flex flex-wrap gap-2"><button ref={volverRef} type="button" disabled={ocupado} onClick={() => { setConfirmarCancelar(false); requestAnimationFrame(() => cancelarRef.current?.focus()); }} className={SECUNDARIO}>{T.acciones.volver}</button>
            <button type="button" disabled={ocupado} onClick={() => { setConfirmarCancelar(false); onCancelar(); }} className="min-h-11 rounded-sm bg-alerta px-4 text-small text-superficie disabled:opacity-50">{T.acciones.confirmarCancelar}</button></div>
        </div>}
      </div>
      <footer className="venta-formulario-pie">
        <p className="flex flex-wrap items-baseline gap-3 text-body font-medium">{T.formulario.total}<span className="cifras font-titulos text-h2">{importe}</span></p>
        <div className="flex flex-wrap items-center gap-3">
          {!cancelado && <button ref={cancelarRef} type="button" disabled={ocupado || confirmarCancelar} onClick={() => { setConfirmarCancelar(true); requestAnimationFrame(() => volverRef.current?.focus()); }} className={`${SECUNDARIO} text-alerta`}>{T.acciones.cancelar}</button>}
          <button type="button" onClick={cerrar} disabled={ocupado} className={PRINCIPAL}>{T.acciones.cerrar}</button>
        </div>
      </footer>
    </div>
  </CapaModal>;
}
