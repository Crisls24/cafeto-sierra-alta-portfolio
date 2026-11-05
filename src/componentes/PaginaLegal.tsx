import type { DocumentoLegal } from "../data/tipos";

/**
 * Plantilla de un documento legal (Aviso de Privacidad o Términos).
 *
 * Es solo presentación: recibe un `DocumentoLegal` de `data/` y lo recorre.
 * No hay cifras, fechas ni textos escritos aquí. Usa únicamente los tokens
 * del sistema (sin sombras) y el ancho de lectura de `.prosa`.
 */
export default function PaginaLegal({ documento }: { documento: DocumentoLegal }) {
  return (
    <main className="min-h-[70vh]">
      <div className="mx-auto w-full max-w-sitio px-4 py-10 sm:px-8 sm:py-14 lg:px-12">
        <article className="max-w-3xl">
          <header>
            <h1 className="font-titulos text-h2 text-coffee">{documento.titulo}</h1>
            <p className="prosa mt-4 text-body text-coffee-medio">{documento.resumen}</p>
            <p className="mt-2 text-small text-tinta-suave">{documento.vigencia}</p>
          </header>

          <div className="mt-10 flex flex-col gap-8">
            {documento.secciones.map((seccion) => (
              <section key={seccion.id} id={seccion.id} className="scroll-mt-24">
                <h2 className="font-titulos text-h4 text-coffee">{seccion.titulo}</h2>
                {seccion.parrafos.map((parrafo) => (
                  <p key={parrafo} className="prosa mt-3 break-words text-body text-coffee-medio">
                    {parrafo}
                  </p>
                ))}
                {seccion.lista && (
                  <ul className="prosa mt-3 list-disc space-y-2 pl-5 text-body text-coffee-medio">
                    {seccion.lista.map((elemento) => (
                      <li key={elemento}>{elemento}</li>
                    ))}
                  </ul>
                )}
                {seccion.enlaces && <ul className="mt-3 space-y-2">
                  {seccion.enlaces.map((enlace) => <li key={enlace.url}><a href={enlace.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-small text-honey-texto underline">{enlace.texto}</a></li>)}
                </ul>}
              </section>
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}
