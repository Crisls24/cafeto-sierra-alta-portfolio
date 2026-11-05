"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Search, ChevronRight, CheckCircle2, Clock3 } from "lucide-react";

import { TEXTOS_VENTAS, ETIQUETAS_CANAL, ETIQUETAS_ENTREGA, ETIQUETAS_PAGO } from "../data/ventas";
import {
  leerVentasPaginadas,
  type PaginaVentas,
  obtenerVenta,
  cambiarEstadoVenta,
  entregarVenta,
  registrarPago,
  cancelarVenta,
  folioVisible,
  fechaMX,
  centavosAPesos,
  solicitarResena,
  revocarInvitacion,
  type VentaAdmin,
} from "../lib/ventasAdmin";
import FormularioVenta from "./FormularioVenta";
import DetalleVenta from "./DetalleVenta";

type Fase = "cargando" | "ok" | "error" | "noAuth";

function useDebounce<T>(valor: T, espera: number): T {
  const [deb, setDeb] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setDeb(valor), espera);
    return () => clearTimeout(t);
  }, [valor, espera]);
  return deb;
}

export default function PanelVentasAdmin() {
  const [fase, setFase] = useState<Fase>("cargando");
  const [ventas, setVentas] = useState<VentaAdmin[]>([]);
  const [meta, setMeta] = useState<Omit<PaginaVentas, "ventas"> | null>(null);
  const [pagina, setPagina] = useState(1);
  const [claveCargada, setClaveCargada] = useState("");
  const solicitud = useRef(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buscar, setBuscar] = useState("");
  const buscarDeb = useDebounce(buscar, 250);
  const [entrega, setEntrega] = useState("");
  const [pago, setPago] = useState("");
  const [canal, setCanal] = useState("");
  const [formAbierto, setFormAbierto] = useState(false);
  const [ventaEditar, setVentaEditar] = useState<VentaAdmin | null>(null);
  const [detalle, setDetalle] = useState<VentaAdmin | null>(null);
  const [enlace, setEnlace] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const claveListado = JSON.stringify([buscarDeb, entrega, pago, canal, pagina]);
  const actualizando = claveCargada !== claveListado;
  const consultar = useCallback(() => {
    const filtros: Record<string, string> = { pagina: String(pagina), limite: "20" };
    if (buscarDeb.trim()) filtros.q = buscarDeb.trim();
    if (entrega) filtros.entrega = entrega;
    if (pago) filtros.pago = pago;
    if (pago === "pendiente") filtros.excluirCanceladas = "1";
    if (canal) filtros.canal = canal;
    return leerVentasPaginadas(filtros);
  }, [buscarDeb, entrega, pago, canal, pagina]);

  const recibir = useCallback((r: Awaited<ReturnType<typeof leerVentasPaginadas>>, peticion: number) => {
    if (peticion !== solicitud.current) return null;
    setClaveCargada(claveListado);
    if (!r.ok) {
      setFase(r.noAutorizado ? "noAuth" : "error");
      return null;
    }
    setVentas(r.datos.ventas);
    setMeta(r.datos);
    setFase("ok");
    return r.datos;
  }, [claveListado]);

  const cargar = useCallback(async () => {
    const peticion = ++solicitud.current;
    return recibir(await consultar(), peticion);
  }, [consultar, recibir]);

  useEffect(() => {
    let activo = true;
    const peticion = ++solicitud.current;
    void consultar().then((r) => { if (activo) recibir(r, peticion); });
    return () => { activo = false; };
  }, [consultar, recibir]);

  function accesoRapido(tipo: "todas" | "cobrar" | "entregar") {
    setEntrega(tipo === "entregar" ? "por_entregar" : "");
    setPago(tipo === "cobrar" ? "pendiente" : "");
    setPagina(1);
  }

  useEffect(() => {
    let activo = true;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("venta");
    if (!id) return;
    void obtenerVenta(id).then((r) => {
      if (!activo) return;
      if (r.ok) {
        setDetalle(r.datos);
        setEnlace(null);
      }
    });
    return () => {
      activo = false;
    };
  }, []);

  function abrirDetalle(v: VentaAdmin) {
    setDetalle(v);
    setEnlace(null);
    setVentaEditar(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("venta", v.id);
      history.replaceState({}, "", url);
    }
  }

  function cerrarDetalle() {
    setDetalle(null);
    setEnlace(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("venta");
      history.replaceState({}, "", url);
    }
  }

  function abrirCrear() {
    setVentaEditar(null);
    setFormAbierto(true);
  }

  function abrirEditar() {
    if (!detalle) return;
    setVentaEditar(detalle);
    setFormAbierto(true);
  }

  function cerrarForm() {
    setFormAbierto(false);
    setVentaEditar(null);
  }

  function guardarOk(id: string) {
    const editada = Boolean(ventaEditar);
    setFormAbierto(false);
    setVentaEditar(null);
    setDetalle(null);
    setEnlace(null);
    setAviso(editada ? TEXTOS_VENTAS.formulario.avisoEditada : TEXTOS_VENTAS.formulario.avisoCreada);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("venta");
      history.replaceState({}, "", url);
    }
    void cargar().then(async (resultado) => {
      if (!resultado) return;
      if (resultado.ventas.some((v) => v.id === id)) return;
      const r = await obtenerVenta(id);
      if (!r.ok) return;
      const v = r.datos;
      const texto = buscarDeb.trim().toLocaleLowerCase("es-MX");
      const coincideTexto = !texto || [String(v.folio ?? ""), v.referencia ?? "", ...v.items.map((item) => item.nombreProducto)].some((t) => t.toLocaleLowerCase("es-MX").includes(texto));
      const coincideEntrega = !entrega || (entrega === "por_entregar" ? ["por_preparar", "listo"].includes(v.estadoEntrega) : entrega === v.estadoEntrega);
      const coincidePago = !pago || (pago === v.estadoPago && (pago !== "pendiente" || v.estadoEntrega !== "cancelado"));
      if (!coincideTexto || !coincideEntrega || !coincidePago || (canal && canal !== v.canal)) setAviso(`${editada ? TEXTOS_VENTAS.formulario.avisoEditada : TEXTOS_VENTAS.formulario.avisoCreada} ${TEXTOS_VENTAS.fueraFiltros}`);
    });
  }

  async function refrescarDetalle() {
    if (!detalle) return;
    const r = await obtenerVenta(detalle.id);
    if (r.ok) {
      setDetalle(r.datos);
      setVentas((prev) => prev.map((v) => (v.id === r.datos.id ? r.datos : v)));
    }
  }

  async function accion(fn: () => Promise<{ ok: true } | { ok: false; noAutorizado: boolean }>, mensaje: string) {
    if (!detalle) return;
    setOcupado(true);
    setAviso(null);
    setError(null);
    const r = await fn();
    setOcupado(false);
    if (!r.ok) {
      setError(r.noAutorizado ? TEXTOS_VENTAS.noAutorizado : TEXTOS_VENTAS.avisos.error);
      return;
    }
    setAviso(mensaje);
    await cargar();
    await refrescarDetalle();
  }

  async function solicitar() {
    if (!detalle) return;
    setOcupado(true);
    setAviso(null);
    setError(null);
    const r = await solicitarResena(detalle.id);
    setOcupado(false);
    if (!r.ok) {
      setError(r.noAutorizado ? TEXTOS_VENTAS.noAutorizado : TEXTOS_VENTAS.avisos.error);
      return;
    }
    await cargar();
    await refrescarDetalle();
    setEnlace(r.datos.url);
    setAviso(TEXTOS_VENTAS.avisos.resenaSolicitada);
  }

  async function revocarSolicitar() {
    if (!detalle?.invitacion) return;
    setOcupado(true);
    setAviso(null);
    setError(null);
    const rev = await revocarInvitacion(detalle.invitacion.id);
    if (!rev.ok) {
      setOcupado(false);
      setError(rev.noAutorizado ? TEXTOS_VENTAS.noAutorizado : TEXTOS_VENTAS.avisos.error);
      return;
    }
    const r = await solicitarResena(detalle.id);
    setOcupado(false);
    if (!r.ok) {
      setError(r.noAutorizado ? TEXTOS_VENTAS.noAutorizado : TEXTOS_VENTAS.avisos.error);
      return;
    }
    await cargar();
    await refrescarDetalle();
    setEnlace(r.datos.url);
    setAviso(TEXTOS_VENTAS.avisos.resenaSolicitada);
  }

  async function copiar(enlaceC: string) {
    try {
      await navigator.clipboard.writeText(enlaceC);
      setAviso(TEXTOS_VENTAS.avisos.copiado);
    } catch {
      setAviso(TEXTOS_VENTAS.avisos.copiadoError);
    }
  }

  if (fase === "cargando") {
    return <p className="text-small text-tinta-suave">{TEXTOS_VENTAS.cargando}</p>;
  }
  if (fase === "noAuth") {
    return <p className="text-small text-coffee">{TEXTOS_VENTAS.noAutorizado}</p>;
  }
  if (fase === "error") {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-small text-alerta">{TEXTOS_VENTAS.error}</p>
        <button
          type="button"
          onClick={() => void cargar()}
          className="inline-flex min-h-11 items-center rounded-sm border border-stone px-4 text-small text-coffee"
        >
          {TEXTOS_VENTAS.reintentar}
        </button>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-titulos text-h2 text-coffee">{TEXTOS_VENTAS.titulo}</h1>
          <p className="text-body text-tinta-suave">{TEXTOS_VENTAS.subtitulo}</p>
        </div>
        <button
          type="button"
          onClick={abrirCrear}
          className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-olivo-admin px-5 text-small text-superficie hover:bg-origen"
        >
          <Plus size={18} aria-hidden="true" />
          {TEXTOS_VENTAS.registrar}
        </button>
      </header>

      <div className="venta-filtros rounded-sm border border-stone bg-superficie p-3">
        <div className="relative self-center">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-tinta-suave">
            <Search size={20} strokeWidth={1.75} className="size-5 shrink-0" aria-hidden="true" />
          </span>
          <input type="search" aria-label={TEXTOS_VENTAS.buscarPlaceholder} value={buscar} maxLength={120} onChange={(e) => { setBuscar(e.target.value); setPagina(1); }} placeholder={TEXTOS_VENTAS.buscarPlaceholder} className="min-h-12 w-full min-w-0 rounded-sm border border-stone bg-superficie pl-10 pr-3 text-small text-coffee" />
        </div>
        <label className="venta-filtro"><span>{TEXTOS_VENTAS.entrega}</span><select value={entrega} onChange={(e) => { setEntrega(e.target.value); setPagina(1); }}>
          <option value="">{TEXTOS_VENTAS.todas}</option><option value="por_entregar">{TEXTOS_VENTAS.porEntregar}</option>
          {Object.entries(ETIQUETAS_ENTREGA).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
        </select></label>
        <label className="venta-filtro"><span>{TEXTOS_VENTAS.pago}</span><select value={pago} onChange={(e) => { setPago(e.target.value); setPagina(1); }}>
          <option value="">{TEXTOS_VENTAS.todos}</option>{Object.entries(ETIQUETAS_PAGO).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
        </select></label>
        <label className="venta-filtro"><span>{TEXTOS_VENTAS.canal}</span><select value={canal} onChange={(e) => { setCanal(e.target.value); setPagina(1); }}>
          <option value="">{TEXTOS_VENTAS.todos}</option>{Object.entries(ETIQUETAS_CANAL).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
        </select></label>
      </div>
      <div className="-mt-2 flex flex-wrap gap-2" role="group" aria-label={TEXTOS_VENTAS.alcanceConteos}>
        {[
          { texto: TEXTOS_VENTAS.todas, numero: meta?.conteos.todas, tipo: "todas" as const, activo: !entrega && !pago },
          { texto: TEXTOS_VENTAS.porCobrar, numero: meta?.conteos.porCobrar, tipo: "cobrar" as const, activo: pago === "pendiente" && !entrega },
          { texto: TEXTOS_VENTAS.porEntregar, numero: meta?.conteos.porEntregar, tipo: "entregar" as const, activo: entrega === "por_entregar" && !pago },
        ].map((item) => <button key={item.tipo} type="button" aria-pressed={item.activo} onClick={() => accesoRapido(item.tipo)} className={`min-h-11 rounded-sm border px-4 text-small ${item.activo ? "border-origen/10 bg-origen-claro text-origen" : "border-stone bg-superficie text-tinta-suave hover:text-coffee"}`}>{item.texto} ({item.numero ?? "—"})</button>)}
      </div>
      {actualizando && <p role="status" className="text-small text-tinta-suave">{TEXTOS_VENTAS.cargando}</p>}
      {aviso ? (
        <p className="text-small text-tinta-suave" role="status" aria-live="polite">
          {aviso}
        </p>
      ) : null}
      {error ? (
        <p className="text-small text-alerta" role="alert">
          {error}
        </p>
      ) : null}

      <div aria-busy={actualizando}>
      {ventas.length === 0 ? (
        <div className="flex min-h-48 items-center justify-center rounded-sm border border-stone bg-superficie p-5 text-center">
          <p className="text-small text-tinta-suave">{buscarDeb || entrega || pago || canal ? TEXTOS_VENTAS.sinResultados : TEXTOS_VENTAS.sinVentas}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-sm border border-stone bg-superficie">
          <div className="venta-lista-cabecera" aria-hidden="true">
            <span>{TEXTOS_VENTAS.folio}</span><span>{TEXTOS_VENTAS.fechaCanal}</span><span>{TEXTOS_VENTAS.productos}</span><span>{TEXTOS_VENTAS.columnas.total}</span><span>{TEXTOS_VENTAS.entrega}</span><span>{TEXTOS_VENTAS.pago}</span><span />
          </div>
          <ul className="divide-y divide-stone">{ventas.map((v) => <li key={v.id}>
            <button type="button" onClick={() => abrirDetalle(v)} className="venta-lista-fila text-small text-coffee hover:bg-pagina" aria-label={`${TEXTOS_VENTAS.verDetalle} ${folioVisible(v.folio)}`}>
              <span className="venta-folio font-medium">{folioVisible(v.folio)}</span>
              <span className="venta-fecha text-tinta-suave">{fechaMX(v.vendidoEn)} / {ETIQUETAS_CANAL[v.canal]}{v.ventaVendedora && <span className="mt-1 block text-olivo-admin">{TEXTOS_VENTAS.detalle.vendedora}</span>}{v.fechaAproximada && <span className="mt-1 block text-label">{TEXTOS_VENTAS.detalle.fechaAproximada}</span>}</span>
              <span className="venta-productos">{v.itemsResumen || TEXTOS_VENTAS.sinDetalle}
                {["publicada", "pendiente", "activa", "rechazada"].includes(v.resenaEstado) && <span className="mt-1 block text-label tracking-normal text-tinta-suave">{v.resenaEstado === "publicada" ? "Reseña publicada" : v.resenaEstado === "pendiente" ? "Pendiente de moderar" : v.resenaEstado === "activa" ? "Invitación activa" : "Reseña oculta"}</span>}
              </span>
              <span className="venta-total cifras font-medium">{v.legado ? "—" : centavosAPesos(v.totalCentavos)}</span>
              <span className="venta-entrega"><span className={`venta-estado ${v.estadoEntrega === "entregado" ? "bg-origen-claro text-origen" : v.estadoEntrega === "cancelado" ? "bg-stone text-tinta-suave" : "bg-honey/10 text-honey-texto"}`}>{v.estadoEntrega === "entregado" ? <CheckCircle2 aria-hidden="true" className="size-4" /> : <Clock3 aria-hidden="true" className="size-4" />}{ETIQUETAS_ENTREGA[v.estadoEntrega]}</span></span>
              <span className="venta-pago"><span className={`venta-estado ${v.estadoPago === "pagado" ? "bg-origen-claro text-origen" : "bg-honey/10 text-honey-texto"}`}>{v.estadoPago === "pagado" ? <CheckCircle2 aria-hidden="true" className="size-4" /> : <Clock3 aria-hidden="true" className="size-4" />}{ETIQUETAS_PAGO[v.estadoPago]}</span></span>
              <ChevronRight aria-hidden="true" className="venta-detalle size-5" />
            </button>
          </li>)}</ul>
        </div>
      )}
      {meta && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-small text-tinta-suave">
        <p>{meta.total} {meta.total === 1 ? "venta" : "ventas"}</p>
        {meta.paginas > 1 && <nav aria-label={TEXTOS_VENTAS.pagina} className="flex flex-wrap items-center gap-3">
          <button disabled={actualizando || meta.pagina <= 1} onClick={() => setPagina(meta.pagina - 1)} className="min-h-11 rounded-sm border border-stone px-3 disabled:opacity-50">{TEXTOS_VENTAS.anterior}</button>
          <span>{TEXTOS_VENTAS.pagina} {meta.pagina} / {meta.paginas}</span>
          <button disabled={actualizando || meta.pagina >= meta.paginas} onClick={() => setPagina(meta.pagina + 1)} className="min-h-11 rounded-sm border border-stone px-3 disabled:opacity-50">{TEXTOS_VENTAS.siguiente}</button>
        </nav>}
      </div>}
      <p className="mt-2 text-label tracking-normal text-tinta-suave">{TEXTOS_VENTAS.alcanceConteos}</p>
      </div>

      {formAbierto ? (
        <FormularioVenta centrado venta={ventaEditar} onCerrar={cerrarForm} onGuardado={guardarOk} />
      ) : null}
      {detalle && !formAbierto ? (
        <DetalleVenta
          venta={detalle}
          enlace={enlace}
          ocupado={ocupado}
          aviso={aviso}
          error={error}
          onCerrar={cerrarDetalle}
          onListo={() => void accion(() => cambiarEstadoVenta(detalle.id, "listo"), TEXTOS_VENTAS.avisos.listo)}
          onEntregar={() => void accion(() => entregarVenta(detalle.id), TEXTOS_VENTAS.avisos.entregado)}
          onPago={() => void accion(() => registrarPago(detalle.id, "pagado"), TEXTOS_VENTAS.avisos.pagado)}
          onSolicitar={() => void solicitar()}
          onRevocarSolicitar={() => void revocarSolicitar()}
          onCancelar={() => void accion(() => cancelarVenta(detalle.id), TEXTOS_VENTAS.avisos.cancelada)}
          onEditar={abrirEditar}
          onCopiar={copiar}
        />
      ) : null}
    </section>
  );
}
