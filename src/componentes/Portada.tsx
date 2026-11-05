import Image from "next/image";
import { mensajeCatalogo } from "../lib/whatsapp";
import { TEXTOS_CAFE } from "../data/cafe";

/**
 * Portada panorámica de Cafeto Sierra Alta.
 *
 * La fotografía ocupa el ancho completo del área principal visible,
 * transmitiendo el origen montañoso y la calidad de los productos.
 * El bloque comercial se integra a la izquierda sobre un velo degradado
 * natural que garantiza contraste y legibilidad sin ocultar el paisaje.
 */
export default function Portada() {
  return (
    <section
      id="portada"
      className="relative flex min-h-[540px] w-full items-center overflow-hidden border-b border-stone bg-coffee sm:min-h-[580px] lg:h-[calc(100vh-61px)] lg:min-h-[600px] lg:max-h-[900px]"
    >
      {/* Fotografía de fondo panorámica */}
      <div className="absolute inset-0 z-0 h-full w-full overflow-hidden">
        <Image
          src="/images/remlazo-portada.webp"
          alt="Cafeto Sierra Alta — Café de altura, quesos artesanales y miel pura de la Sierra Hidalguense"
          fill
          priority
          quality={90}
          sizes="100vw"
          className="hero-foto h-full w-full object-cover object-[72%_center] sm:object-center"
        />
        {/* Velo degradado sutil integrado para máxima legibilidad editorial */}
        <div
          className="portada-scrim absolute inset-0 z-10 pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* Contenido comercial integrado sobre la fotografía */}
      <div className="relative z-20 mx-auto w-full max-w-sitio px-6 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="max-w-[34rem] space-y-4">
          <p className="hero-entrada hero-entrada--pre text-label font-semibold uppercase tracking-[0.2em] text-honey">
            {TEXTOS_CAFE.portada}
          </p>

          <h1 className="hero-entrada hero-entrada--titulo text-[2.75rem] leading-[0.92] tracking-[-0.04em] text-superficie sm:text-portada sm:leading-[1.12]">
            <span className="block font-medium">El sabor del origen,</span>
            <span className="mt-1 block font-normal">directo a tu</span>
            <span className="block font-normal">empresa.</span>
          </h1>

          <p className="hero-entrada hero-entrada--texto text-[0.98rem] leading-[1.6] text-superficie/90 font-normal sm:text-body">
            Café de altura, quesos artesanales y miel pura de la Sierra Hidalguense para acompañar la jornada y recibir a tus invitados.
          </p>

          <div className="hero-entrada hero-entrada--acciones flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
            <a
              href={mensajeCatalogo()}
              className="inline-flex min-h-[44px] items-center justify-center rounded-sm border border-stone/30 bg-coffee px-6 py-3 text-small font-medium text-superficie no-underline transition-all duration-ui ease-ui hover:scale-[var(--scale-boton)] hover:border-honey-profundo hover:bg-coffee-medio focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-honey-profundo"
            >
              Cotizar propuesta corporativa
            </a>
            <a
              href="#catalogo"
              className="inline-flex min-h-[44px] items-center justify-center rounded-sm border border-stone bg-superficie px-5 py-3 text-small font-medium text-coffee no-underline transition-all duration-ui ease-ui hover:scale-[var(--scale-boton)] hover:border-honey-profundo hover:bg-pagina focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-honey-profundo"
            >
              Ver catálogo
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
