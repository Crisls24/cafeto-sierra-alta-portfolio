"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Star } from "lucide-react";
import { TEXTOS_RESENAS_GOOGLE as T } from "../data/resenas";
import { leerConfigGoogle, leerResenasGoogle, type ResenasDeGoogle } from "../lib/googleResenas";
import { formatearFecha, inicialesDe } from "../lib/resenas";

type Estado = { fase: "inicial" | "cargando" | "error" } | { fase: "lista"; datos: ResenasDeGoogle };

export default function ResenasGoogle({ compacto = false }: { compacto?: boolean }) {
  const [config, setConfig] = useState<{ perfil: string; disponible: boolean } | null>(null);
  const [estado, setEstado] = useState<Estado>({ fase: "inicial" });
  const ocupado = useRef(false);
  useEffect(() => {
    let activo = true;
    void leerConfigGoogle().then((datos) => {
      if (activo && datos.googlePerfil) setConfig({ perfil: datos.googlePerfil, disponible: datos.googleResenasDisponibles });
    }).catch(() => {});
    return () => { activo = false; };
  }, []);

  async function cargar() {
    if (ocupado.current) return;
    ocupado.current = true;
    setEstado({ fase: "cargando" });
    try { setEstado({ fase: "lista", datos: await leerResenasGoogle() }); }
    catch { setEstado({ fase: "error" }); }
    finally { ocupado.current = false; }
  }

  if (!config) return null;
  if (compacto) return <aside className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-stone pt-5"><p className="text-small text-tinta-suave">{T.titulo}</p><a href={config.perfil} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-small text-honey-texto underline underline-offset-4">{T.verPerfil}<ExternalLink aria-hidden="true" className="size-4" /></a></aside>;
  return <aside className="mt-8 border-t border-stone pt-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h3 className="font-titulos text-h4 font-medium text-coffee">{T.titulo}</h3>
        <p className="mt-2 text-small text-tinta-suave">{T.descripcion}</p>
      </div>
      <a href={config.perfil} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 shrink-0 items-center gap-2 text-small text-honey-texto underline underline-offset-4">{T.verPerfil}<ExternalLink aria-hidden="true" className="size-4" /></a>
    </div>
    {!compacto && config.disponible && <>
      {(estado.fase === "inicial" || estado.fase === "error") && <button type="button" onClick={() => void cargar()} className="mt-4 min-h-11 rounded-sm border border-stone px-4 text-small text-coffee">{T.cargar}</button>}
      <div aria-live="polite">
        {estado.fase === "cargando" && <p role="status" className="mt-4 text-small text-tinta-suave">{T.cargando}</p>}
        {estado.fase === "error" && <p role="alert" className="mt-4 text-small text-tinta-suave">{T.error}</p>}
        {estado.fase === "lista" && <div className="mt-5 space-y-5">
          <p translate="no" className="whitespace-nowrap font-cuerpo text-small font-normal tracking-normal text-google-atribucion">{T.origen}</p>
          {estado.datos.total > 0 && <p className="text-small text-coffee"><span className="font-semibold">{estado.datos.promedio.toFixed(1)} / 5</span> · {estado.datos.total} {T.opiniones}</p>}
          {estado.datos.resenas.length === 0 ? <p className="text-small text-tinta-suave">{T.vacio}</p> : <>
            <ul className="grid gap-4 sm:grid-cols-2">
              {estado.datos.resenas.map((resena) => <li key={resena.id} className="min-w-0 rounded-sm border border-stone bg-superficie p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone bg-pagina text-label" aria-hidden="true">
                    {resena.foto ? <FotoAutor foto={resena.foto} nombre={resena.nombrePublico} /> : inicialesDe(resena.nombrePublico)}
                  </span>
                  <div className="min-w-0">
                    {resena.perfil ? <a href={resena.perfil} target="_blank" rel="noopener noreferrer" className="break-words text-small font-semibold text-coffee underline underline-offset-4">{resena.nombrePublico}</a> : <p className="break-words text-small font-semibold text-coffee">{resena.nombrePublico}</p>}
                    <p className="text-label tracking-normal text-tinta-suave">{formatearFecha(resena.creadaEn)}</p>
                  </div>
                </div>
                <div role="img" aria-label={`${T.calificacion}: ${resena.calificacion} / 5`} className="mt-4 flex gap-1">
                  {Array.from({ length: 5 }, (_, i) => <Star key={i} aria-hidden="true" className={i < resena.calificacion ? "size-4 fill-honey text-honey" : "size-4 text-stone"} />)}
                </div>
                {resena.comentario && <blockquote className="mt-3 whitespace-pre-wrap break-words text-small leading-6 text-coffee-medio">{resena.comentario}</blockquote>}
                {resena.enlace && <a href={resena.enlace} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center text-small text-honey-texto underline">{T.opinion}</a>}
              </li>)}
            </ul>
            <p className="text-label tracking-normal text-tinta-suave">{T.seleccion}</p>
          </>}
        </div>}
      </div>
    </>}
  </aside>;
}

function FotoAutor({ foto, nombre }: { foto: string; nombre: string }) {
  const [fallo, setFallo] = useState(false);
  // URL externa proporcionada por Places, sin optimizar ni almacenar la foto.
  // eslint-disable-next-line @next/next/no-img-element
  return fallo ? <>{inicialesDe(nombre)}</> : <img src={foto} alt="" width={44} height={44} loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" onError={() => setFallo(true)} />;
}
