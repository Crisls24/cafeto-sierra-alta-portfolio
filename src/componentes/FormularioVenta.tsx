"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import CapaModal from "./CapaModal";
import { TEXTOS_VENTAS as T, ETIQUETAS_CANAL, ETIQUETAS_ENTREGA, ETIQUETAS_PAGO, ETIQUETAS_MOLIENDA, type CanalVenta } from "../data/ventas";
import { crearVenta, actualizarVenta, leerProductos, centavosAPesos, type ProductoAdmin, type VentaAdmin } from "../lib/ventasAdmin";
import { alternarVentaVendedora, cuerpoVenta, datosInicialesVenta, erroresVenta, lineaVacia, precioParaCampo, precioACentavos, seleccionarProducto, subtotalLinea, type DatosVentaForm, type LineaVentaForm } from "../lib/formularioVenta";

const CONTROL = "min-h-11 w-full min-w-0 rounded-sm border border-stone bg-superficie px-3 text-body text-coffee disabled:opacity-60 aria-invalid:border-alerta";
function Campo({ id, titulo, error, children }: { id: string; titulo: string; error?: string; children: React.ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-1.5">
    <label htmlFor={id} className="text-small text-coffee">{titulo}</label>{children}
    {error && <p id={`${id}-error`} className="text-small text-alerta">{error}</p>}
  </div>;
}

export default function FormularioVenta({ venta, onCerrar, onGuardado, centrado = false }: {
  venta?: VentaAdmin | null; onCerrar: () => void; onGuardado: (id: string) => void; centrado?: boolean;
}) {
  const editando = Boolean(venta);
  const [inicial] = useState(() => datosInicialesVenta(venta));
  const [datos, setDatos] = useState<DatosVentaForm>(inicial);
  const [productos, setProductos] = useState<ProductoAdmin[]>([]);
  const [fase, setFase] = useState<"cargando" | "ok" | "error" | "noAuth">("cargando");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [notaAbierta, setNotaAbierta] = useState(Boolean(inicial.nota));
  const siguiente = useRef(Math.max(0, ...inicial.lineas.map((l) => l.clave)) + 1);
  const enviando = useRef(false);
  const formulario = useRef<HTMLFormElement>(null);
  const id = useId();
  const cambios = JSON.stringify(datos) !== JSON.stringify(inicial);
  const cerrar = useCallback(() => {
    if (enviando.current) return;
    if (!cambios || window.confirm(T.formulario.descartar)) onCerrar();
  }, [cambios, onCerrar]);

  const cargarProductos = useCallback(async () => {
    const r = await leerProductos();
    if (!r.ok) { setFase(r.noAutorizado ? "noAuth" : "error"); return; }
    const activos = r.datos.filter((p) => p.activo);
    setProductos(activos);
    setDatos(prev => prev.ventaVendedora ? prev : alternarVentaVendedora(prev, false, activos, venta));
    setFase("ok");
  }, [venta]);
  useEffect(() => {
    let activo = true;
    void leerProductos().then((r) => {
      if (!activo) return;
      if (!r.ok) { setFase(r.noAutorizado ? "noAuth" : "error"); return; }
      setProductos(r.datos.filter((p) => p.activo)); setFase("ok");
    });
    return () => { activo = false; };
  }, []);

  function limpiarErrores(nombres: string[]) {
    setErrores(prev => {
      const siguientes = { ...prev };
      nombres.forEach(nombre => { delete siguientes[nombre]; });
      return siguientes;
    });
    setError(prev => prev === T.formulario.errorResumen ? null : prev);
  }
  function cambiar(cambios: Partial<DatosVentaForm>) {
    setDatos((prev) => ({ ...prev, ...cambios }));
    limpiarErrores(Object.keys(cambios));
  }
  function cambiarLinea(clave: number, cambios: Partial<LineaVentaForm>) {
    setDatos((prev) => ({ ...prev, lineas: prev.lineas.map((l) => l.clave === clave ? { ...l, ...cambios } : l) }));
    const campos: Record<string, string> = { productoId: "producto", presentacionId: "formato", cantidad: "cantidad", precio: "precio", molienda: "molienda" };
    limpiarErrores(Object.keys(cambios).filter(nombre => campos[nombre]).map(nombre => `${campos[nombre]}-${clave}`));
  }
  const campo = (nombre: string) => ({ id: `${id}-${nombre}`, required: nombre !== "nota", "data-campo": nombre, "aria-invalid": Boolean(errores[nombre]), "aria-describedby": errores[nombre] ? `${id}-${nombre}-error` : undefined });
  function enfocar(nombre: string) {
    requestAnimationFrame(() => formulario.current?.querySelector<HTMLElement>(`[data-campo="${nombre}"]`)?.focus());
  }
  async function guardar() {
    if (enviando.current || fase !== "ok") return;
    const invalidos = erroresVenta(datos, productos, editando, venta);
    setErrores(invalidos);
    if (Object.keys(invalidos).length) {
      setError(T.formulario.errorResumen);
      if (invalidos.nota) setNotaAbierta(true);
      enfocar(Object.keys(invalidos)[0]!);
      return;
    }
    enviando.current = true; setOcupado(true); setError(null);
    const body = cuerpoVenta(datos, productos, editando, venta);
    const r = venta ? await actualizarVenta(venta.id, body) : await crearVenta(body);
    if (!r.ok) {
      enviando.current = false; setOcupado(false);
      setError(r.noAutorizado ? T.noAutorizado : r.codigo === "producto_no_existe" ? T.formulario.errorProductoNoDisponible : r.mensaje ?? T.formulario.errorGuardar);
      if (["producto_no_existe", "precio_catalogo", "precio_pendiente"].includes(r.codigo ?? "")) void cargarProductos();
      requestAnimationFrame(() => formulario.current?.querySelector<HTMLElement>('[role="alert"]')?.focus());
      return;
    }
    // El bloqueo permanece hasta desmontar el formulario tras guardar.
    onGuardado(r.datos.id);
  }
  const subtotales = datos.lineas.map(subtotalLinea);
  const subtotalProductos = subtotales.every((s) => s !== null) ? subtotales.reduce<number>((s, v) => s + (v ?? 0), 0) : null;
  const envioCentavos = datos.porPaqueteria ? precioACentavos(datos.envio) : 0;
  const total = subtotalProductos !== null && envioCentavos !== null ? subtotalProductos + envioCentavos : null;
  const totalVisible = total === null ? "—" : new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(total / 100);
  return <CapaModal titulo={editando ? T.formulario.tituloEdicion : T.formulario.titulo} descripcion={T.formulario.subtitulo} centrado={centrado} ocupado={ocupado} onCerrar={cerrar}>
    <form ref={formulario} noValidate className={centrado ? "venta-formulario" : "flex flex-col gap-5"} onSubmit={(e) => { e.preventDefault(); void guardar(); }}>
      <div className={centrado ? "venta-formulario-cuerpo" : ""}>
        {!centrado && <p className="mb-5 text-small text-tinta-suave">{T.formulario.subtitulo}</p>}
        {fase === "cargando" && <p role="status" className="mb-4 text-small text-tinta-suave">{T.formulario.cargandoProductos}</p>}
        {(fase === "error" || fase === "noAuth") && <div role="alert" className="mb-4 text-small text-alerta"><p>{fase === "noAuth" ? T.noAutorizado : T.formulario.errorProductos}</p>{fase === "error" && <button type="button" className="min-h-11 underline" onClick={() => void cargarProductos()}>{T.reintentar}</button>}</div>}
        <fieldset disabled={ocupado || fase !== "ok"} className="min-w-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id={`${id}-fecha`} titulo={T.formulario.fechaVenta} error={errores.fecha}>
              <input {...campo("fecha")} type="date" value={datos.fecha} onChange={(e) => cambiar({ fecha: e.target.value })} className={CONTROL} />
            </Campo>
            <Campo id={`${id}-canal`} titulo={T.canal} error={errores.canal}>
              <select {...campo("canal")} value={datos.canal} onChange={(e) => cambiar({ canal: e.target.value as CanalVenta })} className={CONTROL}>
                {Object.entries(ETIQUETAS_CANAL).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
              </select>
            </Campo>
          </div>
          <div className="mt-4">
            <label className="flex min-h-11 items-center gap-3 text-small text-coffee">
              <input type="checkbox" checked={datos.ventaVendedora} onChange={(e) => { const activa = e.target.checked; setDatos(prev => alternarVentaVendedora(prev, activa, productos, venta)); limpiarErrores(datos.lineas.map(l => `precio-${l.clave}`)); }} aria-describedby={`${id}-vendedora-ayuda`} className="size-5 shrink-0 accent-olivo-admin" />
              {T.formulario.ventaVendedora}
            </label>
            <p id={`${id}-vendedora-ayuda`} className="text-small text-tinta-suave">{T.formulario.ayudaVendedora}</p>
          </div>
          <section aria-labelledby={`${id}-productos`} className="mt-6 border-t border-stone pt-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 id={`${id}-productos`} className="font-titulos text-h4 font-medium">{T.formulario.productos}</h3>
              <button type="button" disabled={datos.lineas.length >= 50} onClick={() => { const clave = siguiente.current++; cambiar({ lineas: [...datos.lineas, lineaVacia(clave)] }); enfocar(`producto-${clave}`); }} className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-origen/10 bg-origen-claro px-3 text-small text-coffee disabled:opacity-50"><Plus aria-hidden="true" className="size-5" />{T.formulario.agregarProducto}</button>
            </div>
            {errores.lineas && <p className="mb-3 text-small text-alerta">{errores.lineas}</p>}
            <div className="grid gap-5">{datos.lineas.map((l, indice) => {
              const producto = productos.find((p) => p.id === l.productoId);
              const formatos = producto?.presentaciones.filter((p) => p.activo) ?? [];
              const cafe = producto?.categoria === "cafe";
              return <div key={l.clave} className={indice ? "border-t border-stone pt-5" : ""}>
                <div className="venta-producto-fila">
                  <Campo id={`${id}-producto-${l.clave}`} titulo={T.formulario.producto} error={errores[`producto-${l.clave}`]}>
                    <select {...campo(`producto-${l.clave}`)} value={l.productoId} onChange={(e) => cambiarLinea(l.clave, seleccionarProducto(l, productos.find((p) => p.id === e.target.value)))} className={CONTROL}>
                      <option value="">{T.formulario.elegirProducto}</option>{productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </Campo>
                  <Campo id={`${id}-formato-${l.clave}`} titulo={T.formulario.presentacion} error={errores[`formato-${l.clave}`]}>
                    <select {...campo(`formato-${l.clave}`)} value={l.presentacionId} disabled={!producto} onChange={(e) => { const formato = formatos.find((p) => p.id === e.target.value); cambiarLinea(l.clave, { presentacionId: formato?.id ?? "", precio: precioParaCampo(formato?.precioCentavos ?? null) }); }} className={CONTROL}>
                      <option value="">{T.formulario.elegirPresentacion}</option>{formatos.map((p) => <option key={p.id} value={p.id}>{p.nombre} · {p.precioCentavos === null ? T.precioPendiente : centavosAPesos(p.precioCentavos)}</option>)}
                    </select>
                  </Campo>
                  <button type="button" disabled={datos.lineas.length === 1} aria-label={`${T.formulario.quitarProducto} ${indice + 1}`} onClick={() => { cambiar({ lineas: datos.lineas.filter((it) => it.clave !== l.clave) }); enfocar(`producto-${datos.lineas[indice - 1]?.clave ?? datos.lineas[indice + 1]?.clave}`); }} className="flex min-h-11 min-w-11 items-center justify-center self-end rounded-sm text-alerta hover:bg-alerta/5 disabled:opacity-30"><Trash2 aria-hidden="true" className="size-5" /></button>
                </div>
                <div className={`mt-4 grid gap-4 ${cafe ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                  <Campo id={`${id}-cantidad-${l.clave}`} titulo={T.formulario.cantidad} error={errores[`cantidad-${l.clave}`]}>
                    <input {...campo(`cantidad-${l.clave}`)} type="number" inputMode="numeric" min={1} max={10000} step={1} value={l.cantidad} onChange={(e) => cambiarLinea(l.clave, { cantidad: e.target.value })} className={CONTROL} />
                  </Campo>
                  <Campo id={`${id}-precio-${l.clave}`} titulo={T.formulario.precioUnitario} error={errores[`precio-${l.clave}`]}>
                    <div className="relative"><span aria-hidden="true" className="absolute inset-y-0 left-3 flex items-center text-tinta-suave">$</span><input {...campo(`precio-${l.clave}`)} type="text" inputMode="decimal" value={l.precio} readOnly={!datos.ventaVendedora} placeholder={T.precioPendiente} onChange={(e) => { if (datos.ventaVendedora) cambiarLinea(l.clave, { precio: e.target.value }); }} onBlur={() => { const centavos = precioACentavos(l.precio); if (centavos !== null) cambiarLinea(l.clave, { precio: precioParaCampo(centavos) }); }} className={`${CONTROL} pl-7 read-only:bg-pagina`} /></div>
                    <p className="text-small text-tinta-suave">{datos.ventaVendedora ? T.formulario.ayudaPrecio : T.formulario.ayudaPrecioNormal}</p>
                    {datos.ventaVendedora && formatos.find((p) => p.id === l.presentacionId)?.precioCentavos != null && <p className="text-small text-tinta-suave">{T.formulario.precioHabitual}: {centavosAPesos(formatos.find((p) => p.id === l.presentacionId)!.precioCentavos!)}</p>}
                  </Campo>
                  {cafe && <Campo id={`${id}-molienda-${l.clave}`} titulo={T.formulario.molienda} error={errores[`molienda-${l.clave}`]}>
                    <select {...campo(`molienda-${l.clave}`)} value={l.molienda} onChange={(e) => cambiarLinea(l.clave, { molienda: e.target.value as LineaVentaForm["molienda"] })} className={CONTROL}>{Object.entries(ETIQUETAS_MOLIENDA).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}</select>
                  </Campo>}
                </div>
                {datos.lineas.length > 1 && <p className="mt-2 text-right text-small text-tinta-suave">{T.formulario.subtotal}: <span className="cifras text-coffee">{subtotales[indice] === null ? "—" : centavosAPesos(subtotales[indice]!)}</span></p>}
              </div>;
            })}</div>
          </section>
          <section className="mt-6 border-t border-stone pt-4">
            <label className="flex min-h-11 items-center gap-3 text-small text-coffee">
              <input type="checkbox" checked={datos.porPaqueteria} onChange={(e) => cambiar({ porPaqueteria: e.target.checked, envio: "" })} aria-controls={`${id}-envio-grupo`} className="size-5 shrink-0 accent-olivo-admin" />
              {T.formulario.porPaqueteria}
            </label>
            <div id={`${id}-envio-grupo`} hidden={!datos.porPaqueteria} className="mt-3 grid gap-2 sm:w-1/2">
              <Campo id={`${id}-envio`} titulo={T.formulario.importeEnvio} error={errores.envio}>
                <div className="relative"><span aria-hidden="true" className="absolute inset-y-0 left-3 flex items-center text-tinta-suave">$</span><input {...campo("envio")} type="text" inputMode="decimal" disabled={!datos.porPaqueteria} value={datos.envio} onChange={(e) => cambiar({ envio: e.target.value })} onBlur={() => { const centavos = precioACentavos(datos.envio); if (centavos !== null) cambiar({ envio: precioParaCampo(centavos) }); }} className={`${CONTROL} pl-7`} /></div>
                <p className="text-small text-tinta-suave">{T.formulario.ayudaEnvio}</p>
              </Campo>
            </div>
          </section>
          <div className="mt-6 grid gap-4 border-t border-stone pt-5 sm:grid-cols-2">
            {!editando && <div className="grid content-start gap-3">
              <Campo id={`${id}-entrega`} titulo={T.formulario.entrega} error={errores.entrega}>
                <select {...campo("entrega")} value={datos.entrega} onChange={(e) => cambiar({ entrega: e.target.value as DatosVentaForm["entrega"], fechaEntrega: "" })} className={CONTROL}>
                  {Object.entries(ETIQUETAS_ENTREGA).filter(([valor]) => valor !== "cancelado").map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
                </select>
              </Campo>
              {datos.entrega === "entregado" && <Campo id={`${id}-fechaEntrega`} titulo={T.formulario.fechaEntrega} error={errores.fechaEntrega}><input {...campo("fechaEntrega")} type="date" value={datos.fechaEntrega} onChange={(e) => cambiar({ fechaEntrega: e.target.value })} className={CONTROL} /></Campo>}
            </div>}
            <div className="grid content-start gap-3">
              <Campo id={`${id}-pago`} titulo={T.formulario.pago} error={errores.pago}>
                <select {...campo("pago")} value={datos.pago} onChange={(e) => cambiar({ pago: e.target.value as DatosVentaForm["pago"] })} className={CONTROL}>{Object.entries(ETIQUETAS_PAGO).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}</select>
              </Campo>
            </div>
          </div>
          <div className="mt-5 border-t border-stone pt-2">
            <button type="button" aria-expanded={notaAbierta} aria-controls={`${id}-nota-grupo`} onClick={() => setNotaAbierta((p) => !p)} className="flex min-h-11 w-full items-center gap-2 text-left text-small text-coffee"><Plus aria-hidden="true" className="size-5" />{T.formulario.agregarNota}<ChevronDown aria-hidden="true" className={`ml-auto size-4 ${notaAbierta ? "rotate-180" : ""}`} /></button>
            <div id={`${id}-nota-grupo`} hidden={!notaAbierta}><Campo id={`${id}-nota`} titulo={T.formulario.nota} error={errores.nota}><textarea {...campo("nota")} value={datos.nota} maxLength={120} rows={2} onChange={(e) => cambiar({ nota: e.target.value })} placeholder={T.formulario.notaPlaceholder} className={`${CONTROL} py-2`} /></Campo></div>
          </div>
        </fieldset>
        {error && <p role="alert" tabIndex={-1} className="mt-4 text-small text-alerta">{error}</p>}
      </div>
      <footer className="venta-formulario-pie">
        <output className="grid min-w-0 gap-1" aria-live="polite">
        <span className="flex flex-wrap items-baseline gap-3 text-body font-medium">{T.formulario.total}<span className="cifras font-titulos text-h2">{totalVisible}{total !== null && <span className="ml-1 text-h4">MXN</span>}</span></span>
        </output>
        <div className="flex items-center gap-3">
          <button type="button" disabled={ocupado} onClick={cerrar} className="min-h-11 rounded-sm border border-stone bg-superficie px-5 text-small text-coffee disabled:opacity-50">{T.formulario.cancelar}</button>
          <button type="submit" disabled={ocupado || fase !== "ok"} className="min-h-11 rounded-sm bg-olivo-admin px-5 text-small text-superficie hover:bg-origen disabled:opacity-50">{ocupado ? T.formulario.guardando : editando ? T.formulario.guardarCambios : T.formulario.guardar}</button>
        </div>
      </footer>
    </form>
  </CapaModal>;
}
