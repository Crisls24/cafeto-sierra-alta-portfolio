import Link from "next/link";
import { PAGINAS_CAFE, TEXTOS_CAFE } from "@/data/cafe";

export default function ExplorarCafe({ actual }: { actual?: string }) {
  return (
    <section aria-labelledby="explorar-cafe" className="mx-auto w-full max-w-sitio px-4 py-12 sm:px-8 lg:px-12">
      <h2 id="explorar-cafe" className="font-titulos text-h2 text-coffee">
        {actual ? TEXTOS_CAFE.relacionados : TEXTOS_CAFE.explorar}
      </h2>
      <p className="mt-3 max-w-prose text-body text-tinta-suave">{TEXTOS_CAFE.bajada}</p>
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {Object.values(PAGINAS_CAFE).filter((pagina) => pagina.ruta !== actual).map((pagina) => (
          <Link key={pagina.ruta} href={pagina.ruta} className="block min-h-11 border-t border-stone py-5 no-underline transition-colors duration-ui hover:border-honey-profundo">
            <span className="text-label uppercase text-honey-texto">{pagina.etiqueta}</span>
            <h3 className="mt-3 font-titulos text-h4 text-coffee">{pagina.titulo}</h3>
            <p className="mt-3 text-small text-tinta-suave">{pagina.descripcion}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
