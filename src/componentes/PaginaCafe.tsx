import Image from "next/image";
import Link from "next/link";
import { TEXTOS_CAFE, type PaginaCafeData } from "@/data/cafe";
import { PRODUCTOS } from "@/data/productos";
import { SITIO } from "@/data/sitio";
import { textoCatalogo } from "@/lib/whatsapp";
import BotonFlotante from "./BotonFlotante";
import EnlaceCotizacion from "./EnlaceCotizacion";
import ExplorarCafe from "./ExplorarCafe";
import PiePagina from "./PiePagina";
import TarjetaProducto from "./TarjetaProducto";

export default function PaginaCafe({ pagina }: { pagina: PaginaCafeData }) {
  const url = `${SITIO.url}${pagina.ruta}`;
  const grafo = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": url, url, name: pagina.titulo, description: pagina.descripcion, inLanguage: "es-MX", breadcrumb: { "@id": `${url}#migas` } },
      { "@type": "BreadcrumbList", "@id": `${url}#migas`, itemListElement: [
        { "@type": "ListItem", position: 1, name: SITIO.nombre, item: `${SITIO.url}/` },
        { "@type": "ListItem", position: 2, name: pagina.etiqueta, item: url },
      ] },
    ],
  };

  return (
    <>
      <main id="contenido">
        <div className="mx-auto w-full max-w-sitio px-4 py-10 sm:px-8 lg:px-12">
          <nav aria-label="Ruta de navegación" className="flex flex-wrap items-center gap-2 text-small text-tinta-suave">
            <Link href="/" className="inline-flex min-h-11 items-center text-honey-texto underline underline-offset-4">{TEXTOS_CAFE.inicio}</Link>
            <span aria-hidden="true">/</span><span aria-current="page">{pagina.etiqueta}</span>
          </nav>
          <header className="mt-6 grid items-center gap-8 lg:grid-cols-2">
            <div>
              <p className="text-label uppercase text-honey-texto">{pagina.etiqueta}</p>
              <h1 className="mt-4 font-titulos text-portada text-coffee">{pagina.titulo}</h1>
              <p className="mt-6 text-body text-tinta-suave">{pagina.introduccion}</p>
              <Link href="/?categoria=cafe#catalogo" className="mt-6 inline-flex min-h-11 items-center rounded-sm bg-coffee px-5 py-3 text-small text-superficie no-underline transition-colors duration-ui hover:bg-coffee-medio">{TEXTOS_CAFE.verCatalogo}</Link>
            </div>
            <Image src={pagina.foto} alt={pagina.alt} width={960} height={720} sizes="(min-width: 1024px) 50vw, 100vw" priority className="aspect-[4/3] w-full rounded-sm object-cover" />
          </header>
          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {pagina.bloques.map((bloque) => (
              <section key={bloque.titulo} className="border-t border-stone pt-6">
                <h2 className="font-titulos text-h2 text-coffee">{bloque.titulo}</h2>
                {bloque.parrafos.map((parrafo) => <p key={parrafo} className="mt-4 max-w-prose text-body text-tinta-suave">{parrafo}</p>)}
                {bloque.puntos && <ul className="mt-4 list-disc space-y-3 pl-5 text-body text-tinta-suave">{bloque.puntos.map((punto) => <li key={punto}>{punto}</li>)}</ul>}
              </section>
            ))}
          </div>
          {pagina.mostrarCatalogo && (
            <section aria-labelledby="catalogo-cafe" className="mt-12">
              <h2 id="catalogo-cafe" className="font-titulos text-h2 text-coffee">{TEXTOS_CAFE.catalogo}</h2>
              <ul className="mt-6 grid gap-6 md:grid-cols-3">{PRODUCTOS.filter((producto) => producto.activo && producto.categoria === "cafe").map((producto) => <li key={producto.id}><TarjetaProducto producto={producto} /></li>)}</ul>
            </section>
          )}
          <section aria-labelledby="preguntas-cafe" className="mt-12 border-t border-stone pt-6">
            <h2 id="preguntas-cafe" className="font-titulos text-h2 text-coffee">{TEXTOS_CAFE.preguntas}</h2>
            {pagina.preguntas.map(({ pregunta, respuesta }) => (
              <details key={pregunta} className="border-b border-stone py-3">
                <summary className="flex min-h-11 cursor-pointer items-center text-body font-semibold text-coffee">{pregunta}</summary>
                <p className="max-w-prose pb-3 pt-2 text-body text-tinta-suave">{respuesta}</p>
              </details>
            ))}
          </section>
          <section className="mt-10 rounded-sm border border-stone bg-superficie p-6 sm:p-8">
            <h2 className="font-titulos text-h2 text-coffee">{TEXTOS_CAFE.contacto}</h2>
            <p className="mt-3 text-body text-tinta-suave">{TEXTOS_CAFE.contactoDetalle}</p>
            <EnlaceCotizacion mensaje={textoCatalogo()} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-sm bg-coffee px-5 py-3 text-small text-superficie no-underline transition-colors duration-ui hover:bg-coffee-medio">{TEXTOS_CAFE.cotizar}</EnlaceCotizacion>
          </section>
        </div>
        <ExplorarCafe actual={pagina.ruta} />
      </main>
      <PiePagina />
      <BotonFlotante />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(grafo).replace(/</g, "\\u003c") }} />
    </>
  );
}
