"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import Link from "next/link";

import {
  CLAVE_RESUMEN_POR_ESTADO,
  ESTADOS_PANEL,
  NOMBRES_ESTADO_PANEL,
  TEXTOS_PANEL,
  type EstadoPanel,
} from "../data/resenas";
import { ETIQUETAS_CANAL } from "../data/ventas";
import { folioVisible, fechaMX } from "../lib/ventasAdmin";
import { TEXTOS_IDENTIDAD_RESENA as TI, TEXTOS_RESENAS } from "../data/resenas";
import { inicialesDe } from "../lib/resenas";
import {
  decidirResena,
  formatearFechaHora,
  leerResenasPanel,
  leerResumenPanel,
  type ResenaAdmin,
  type ResumenPanel,
} from "../lib/resenasAdmin";

type FasePantalla = "cargando" | "noAutorizado" | "error" | "lista";

type Carga =
  | { fase: "lista"; resumen: ResumenPanel; resenas: ResenaAdmin[] }
  | { fase: "noAutorizado" }
  | { fase: "error" };

const ID_LISTA = "panel-resenas";

export default function PanelResenasAdmin() {
  const [fase, setFase] = useState<FasePantalla>("cargando");
  const [resumen, setResumen] = useState<ResumenPanel | null>(null);
  const [resenas, setResenas] = useState<ResenaAdmin[]>([]);
  const [estadoActivo, setEstadoActivo] = useState<EstadoPanel>(() => { const valor = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("estado"); return ESTADOS_PANEL.includes(valor as EstadoPanel) ? valor as EstadoPanel : "pendiente"; });
  const [pedidoId, setPedidoId] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("venta") || "");
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [rechazandoId, setRechazandoId] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const pestañasRef = useRef<Record<EstadoPanel, HTMLButtonElement | null>>({
    pendiente: null,
    aprobada: null,
    rechazada: null,
  });

  const cargarLista = useCallback(async (estado: EstadoPanel): Promise<Carga> => {
    const [resumenResultado, listaResultado] = await Promise.all([
      leerResumenPanel(),
      leerResenasPanel(estado, pedidoId),
    ]);
    if (!resumenResultado.ok) {
      return { fase: resumenResultado.noAutorizado ? "noAutorizado" : "error" };
    }
    if (!listaResultado.ok) {
      return { fase: listaResultado.noAutorizado ? "noAutorizado" : "error" };
    }
    return {
      fase: "lista",
      resumen: resumenResultado.datos,
      resenas: listaResultado.datos,
    };
  }, [pedidoId]);

  const aplicarCarga = useCallback((carga: Carga) => {
    if (carga.fase === "lista") {
      setResumen(carga.resumen);
      setResenas(carga.resenas);
      setFase("lista");
      return;
    }
    setFase(carga.fase);
  }, []);

  useEffect(() => {
    const estado: EstadoPanel = estadoActivo;
    let activo = true;
    void cargarLista(estado).then((carga) => {
      if (activo) aplicarCarga(carga);
    });
    return () => {
      activo = false;
    };
  }, [estadoActivo, cargarLista, aplicarCarga]);

  const reintentar = () => {
    setFase("cargando");
    void cargarLista(estadoActivo).then(aplicarCarga);
  };

  const seleccionarPestaña = (pestana: EstadoPanel) => {
    setEstadoActivo(pestana);
    setFase("cargando");
    if (rechazandoId !== null) {
      setRechazandoId(null);
      setMotivoRechazo("");
    }
  };

  const moverPestaña = (desplazamiento: number) => {
    const indice = ESTADOS_PANEL.indexOf(estadoActivo);
    if (indice < 0) return;
    const siguiente =
      (indice + desplazamiento + ESTADOS_PANEL.length) % ESTADOS_PANEL.length;
    const objetivo = ESTADOS_PANEL[siguiente] as EstadoPanel;
    setEstadoActivo(objetivo);
    setFase("cargando");
    pestañasRef.current[objetivo]?.focus();
  };

  const alTecladoPestaña = (evento: React.KeyboardEvent) => {
    if (evento.key === "ArrowRight" || evento.key === "ArrowDown") {
      evento.preventDefault();
      moverPestaña(1);
    } else if (evento.key === "ArrowLeft" || evento.key === "ArrowUp") {
      evento.preventDefault();
      moverPestaña(-1);
    }
  };

  const abrirRechazo = (id: string) => {
    setRechazandoId(id);
    setMotivoRechazo("");
  };

  const cancelarRechazo = () => {
    setRechazandoId(null);
    setMotivoRechazo("");
  };

  const publicar = async (id: string) => {
    setAviso(null);
    setOcupado(true);
    const resultado = await decidirResena(id, "aprobada");
    setOcupado(false);
    if (!resultado.ok) {
      setAviso(
        resultado.noAutorizado ? TEXTOS_PANEL.errores.noAutorizado : TEXTOS_PANEL.errores.accion
      );
      return;
    }
    setAviso(TEXTOS_PANEL.avisos.publicada);
    reintentar();
  };

  const rechazar = async (id: string) => {
    const motivo = motivoRechazo.trim();
    if (motivo.length === 0) {
      setAviso(TEXTOS_PANEL.errores.motivoRequerido);
      return;
    }
    setAviso(null);
    setOcupado(true);
    const resultado = await decidirResena(id, "rechazada", motivo);
    setOcupado(false);
    if (!resultado.ok) {
      setAviso(
        resultado.noAutorizado ? TEXTOS_PANEL.errores.noAutorizado : TEXTOS_PANEL.errores.accion
      );
      return;
    }
    setRechazandoId(null);
    setMotivoRechazo("");
    setAviso(TEXTOS_PANEL.avisos.rechazada);
    reintentar();
  };

  const contador = (clave: keyof ResumenPanel) => resumen?.[clave] ?? 0;

  if (fase === "cargando") {
    return (
      <section className="flex min-h-[16rem] items-center justify-center">
        <p className="text-small text-tinta-suave">{TEXTOS_PANEL.cargando}</p>
      </section>
    );
  }

  if (fase === "noAutorizado") {
    return (
      <section className="flex min-h-[16rem] flex-col items-center justify-center gap-3 text-center">
        <p className="max-w-sm text-body text-coffee">
          {TEXTOS_PANEL.errores.noAutorizado}
        </p>
        <a
          href="/admin/ventas"
          className="inline-flex min-h-11 items-center rounded-sm border border-stone px-4 text-small text-coffee transition-colors hover:bg-superficie"
        >
          {TEXTOS_PANEL.acciones.volver}
        </a>
      </section>
    );
  }

  if (fase === "error") {
    return (
      <section className="flex min-h-[16rem] flex-col items-center justify-center gap-3 text-center">
        <p className="max-w-sm text-body text-coffee">{TEXTOS_PANEL.errores.lista}</p>
        <button
          type="button"
          onClick={reintentar}
          className="inline-flex min-h-11 items-center rounded-sm border border-stone px-4 text-small text-coffee transition-colors hover:bg-superficie"
        >
          {TEXTOS_PANEL.acciones.reintentar}
        </button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-titulos text-h2">{TEXTOS_PANEL.titulo}</h1>
        <p className="text-body text-tinta-suave">{TEXTOS_PANEL.subtitulo}</p>
        <div className="text-small text-tinta-suave">
          <Link href="/admin/ventas" className="underline underline-offset-4">
            Ver Ventas
          </Link>
        </div>
      </header>

      <p className="text-small text-tinta-suave">{TI.politicaModeracion}</p>
      {pedidoId && <button type="button" onClick={() => { setFase("cargando"); setPedidoId(""); history.replaceState({}, "", "/admin/resenas/"); }} className="min-h-11 self-start text-small text-olivo-admin underline">{TI.todas}</button>}
      <nav
        aria-label={TEXTOS_PANEL.pestañas.aria}
        role="tablist"
        className="flex flex-wrap items-center gap-2"
        onKeyDown={alTecladoPestaña}
      >
        {ESTADOS_PANEL.map((estado) => {
          const seleccionado = estadoActivo === estado;
          const clave = CLAVE_RESUMEN_POR_ESTADO[estado];
          return (
            <button
              key={estado}
              ref={(nodo) => {
                pestañasRef.current[estado] = nodo;
              }}
              type="button"
              role="tab"
              aria-selected={seleccionado}
              aria-controls={ID_LISTA}
              id={`tab-${estado}`}
              onClick={() => seleccionarPestaña(estado)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-sm border px-4 text-small transition-colors ${
                seleccionado
                  ? "border-honey-profundo bg-superficie text-coffee"
                  : "border-stone text-coffee hover:bg-superficie"
              }`}
            >
              <span>{NOMBRES_ESTADO_PANEL[estado]}</span>
              <span
                className={`rounded-sm px-1.5 py-0.5 text-label tracking-wide ${
                  seleccionado ? "bg-honey/20 text-honey-texto" : "bg-pagina text-tinta-suave"
                }`}
                aria-label={`${contador(clave)} ${TEXTOS_PANEL.pestañas.contador}`}
              >
                {contador(clave)}
              </span>
            </button>
          );
        })}
      </nav>

      <section id={ID_LISTA} role="tabpanel" aria-labelledby={`tab-${estadoActivo}`}>
        {aviso ? (
          <p className="mb-4 text-small text-tinta-suave" role="status" aria-live="polite">
            {aviso}
          </p>
        ) : null}

        {resenas.length === 0 ? (
          <div className="flex min-h-[12rem] items-center justify-center rounded-sm border border-stone bg-superficie">
            <p className="text-small text-tinta-suave">{TEXTOS_PANEL.vacia[estadoActivo]}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {resenas.map((resena) => (
              <li
                key={resena.id}
                className="flex flex-col gap-4 rounded-sm border border-stone bg-superficie px-5 py-5"
              >
                <header className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-stone text-small text-tinta-suave"
                      aria-hidden="true"
                    >
                      {inicialesDe(resena.nombrePublico)}
                    </span>
                    <div className="flex flex-col gap-1">
                      <p className="text-body text-coffee">{resena.nombrePublico}</p>
                      <div
                        className="flex items-center gap-1"
                        aria-label={`${resena.calificacion} ${TEXTOS_PANEL.resena.estrellaDe}`}
                      >
                        {Array.from({ length: 5 }, (_, indice) => (
                          <Star
                            key={indice}
                            size={14}
                            className={
                              indice < resena.calificacion
                                ? "fill-honey text-honey"
                                : "text-stone"
                            }
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <time
                    dateTime={resena.creadaEn}
                    className="text-small text-tinta-suave"
                    title={formatearFechaHora(resena.creadaEn)}
                  >
                    {formatearFechaHora(resena.creadaEn)}
                  </time>
                </header>

                <div className="flex flex-wrap items-center gap-2 text-small text-tinta-suave">
                  <span>Venta {folioVisible(resena.folio)}</span>
                  {resena.itemsResumen ? <span aria-hidden="true">·</span> : null}
                  {resena.itemsResumen ? <span>{resena.itemsResumen}</span> : null}
                  <span aria-hidden="true">·</span>
                  <span>
                    {ETIQUETAS_CANAL[resena.canal as keyof typeof ETIQUETAS_CANAL] ??
                      resena.canal}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{fechaMX(resena.vendidoEn)}</span>
                </div>

                <p className="line-clamp-3 whitespace-pre-wrap break-words text-small text-coffee">{resena.comentario}</p>
                {resena.verificada && <p className="text-small text-origen" title={TI.verificadaAyuda}>{TEXTOS_RESENAS.verificada}</p>}
                <details className="min-w-0 border-t border-stone pt-2"><summary className="min-h-11 cursor-pointer py-2 text-small text-olivo-admin">{TI.detalle}</summary>
                  <p className="whitespace-pre-wrap break-words text-small">{resena.comentario}</p>
                  <p className="mt-3 text-small text-tinta-suave">{TI.metodo}: {resena.identificacion === "google" ? "Google" : TI.invitado}</p>
                  <p className="mt-1 text-small text-tinta-suave">{NOMBRES_ESTADO_PANEL[resena.estado]} · {formatearFechaHora(resena.creadaEn)}</p>
                  {resena.moderadaEn && <p className="mt-1 text-small text-tinta-suave">{formatearFechaHora(resena.moderadaEn)} · {resena.moderadoPor}</p>}
                  {resena.publicadaEn && <p className="mt-1 text-small text-tinta-suave">{TEXTOS_PANEL.resena.publicadaEn} {formatearFechaHora(resena.publicadaEn)}</p>}
                  <Link href={`/admin/ventas?venta=${encodeURIComponent(resena.pedidoId)}`} className="inline-flex min-h-11 items-center text-small">{folioVisible(resena.folio)}</Link>
                </details>

                {estadoActivo === "aprobada" && resena.moderadaEn ? (
                  <p className="text-small text-tinta-suave">
                    {TEXTOS_PANEL.resena.publicadaEn} {formatearFechaHora(resena.moderadaEn)}
                    {resena.moderadoPor ? ` · ${resena.moderadoPor}` : ""}
                  </p>
                ) : null}

                {estadoActivo === "rechazada" && resena.motivoRechazo ? (
                  <div className="rounded-sm border border-alerta/40 bg-alerta/5 px-4 py-3">
                    <p className="text-small text-coffee">{TEXTOS_PANEL.resena.motivo}</p>
                    <p className="mt-1 whitespace-pre-wrap text-small text-tinta-suave">
                      {resena.motivoRechazo}
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  {estadoActivo === "pendiente" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => publicar(resena.id)}
                        disabled={ocupado}
                        className="inline-flex min-h-11 items-center rounded-sm bg-olivo-admin px-4 text-small text-superficie transition-opacity disabled:opacity-60"
                      >
                        {TEXTOS_PANEL.acciones.publicar}
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirRechazo(resena.id)}
                        disabled={ocupado}
                        className="inline-flex min-h-11 items-center rounded-sm border border-stone px-4 text-small text-coffee transition-colors hover:bg-pagina disabled:opacity-60"
                      >
                        {TEXTOS_PANEL.acciones.rechazar}
                      </button>
                    </>
                  ) : null}

                  {estadoActivo === "aprobada" ? (
                    <button
                      type="button"
                      onClick={() => abrirRechazo(resena.id)}
                      disabled={ocupado}
                      className="inline-flex min-h-11 items-center rounded-sm border border-stone px-4 text-small text-coffee transition-colors hover:bg-pagina disabled:opacity-60"
                    >
                      {TEXTOS_PANEL.acciones.ocultar}
                    </button>
                  ) : null}

                  {estadoActivo === "rechazada" ? (
                    <button
                      type="button"
                      onClick={() => publicar(resena.id)}
                      disabled={ocupado}
                      className="inline-flex min-h-11 items-center rounded-sm bg-olivo-admin px-4 text-small text-superficie transition-opacity disabled:opacity-60"
                    >
                      {TEXTOS_PANEL.acciones.publicar}
                    </button>
                  ) : null}
                </div>

                {rechazandoId === resena.id ? (
                  <div className="flex flex-col gap-3 rounded-sm border border-stone px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-body text-coffee">{TEXTOS_PANEL.rechazo.titulo}</p>
                      <p className="text-small text-tinta-suave">{TEXTOS_PANEL.rechazo.subtitulo}</p>
                    </div>
                    <label className="flex flex-col gap-2">
                      <span className="text-small text-coffee">{TEXTOS_PANEL.rechazo.etiqueta}</span>
                      <textarea
                        value={motivoRechazo}
                        onChange={(evento) => setMotivoRechazo(evento.target.value)}
                        rows={4}
                        maxLength={300}
                        className="w-full rounded-sm border border-stone bg-pagina px-3 py-2 text-body text-coffee"
                      />
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => rechazar(resena.id)}
                        disabled={ocupado}
                        className="inline-flex min-h-11 items-center rounded-sm bg-alerta px-4 text-small text-superficie transition-opacity disabled:opacity-60"
                      >
                        {TEXTOS_PANEL.acciones.confirmarRechazo}
                      </button>
                      <button
                        type="button"
                        onClick={cancelarRechazo}
                        disabled={ocupado}
                        className="inline-flex min-h-11 items-center rounded-sm border border-stone px-4 text-small text-coffee transition-colors hover:bg-pagina disabled:opacity-60"
                      >
                        {TEXTOS_PANEL.acciones.cancelar}
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
