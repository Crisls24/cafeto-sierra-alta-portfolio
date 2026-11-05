"use client";

import { useEffect, useState } from "react";
import { textoFlotante } from "../lib/whatsapp";
import EnlaceCotizacion from "./EnlaceCotizacion";

export default function BotonFlotante() {
  const [visible, setVisible] = useState(false);
  const [origenVisible, setOrigenVisible] = useState(false);
  const [pieVisible, setPieVisible] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      setVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", checkScroll, { passive: true });
    checkScroll();

    const seccionOrigen = document.getElementById("origen");
    const observadorOrigen = seccionOrigen
        ? new IntersectionObserver((entradas) => {
          setOrigenVisible(entradas[0]?.isIntersecting ?? false);
        }, { threshold: 0.1 })
      : null;

    if (seccionOrigen && observadorOrigen) observadorOrigen.observe(seccionOrigen);

    // El botón se aparta cuando el pie entra en pantalla, para no tapar
    // los enlaces legales ni el contacto que ya vive ahí abajo.
    const pie = document.querySelector("footer");
    const observadorPie = pie
      ? new IntersectionObserver((entradas) => {
          setPieVisible(entradas[0]?.isIntersecting ?? false);
        }, { threshold: 0.15 })
      : null;

    if (pie && observadorPie) observadorPie.observe(pie);

    return () => {
      window.removeEventListener("scroll", checkScroll);
      observadorOrigen?.disconnect();
      observadorPie?.disconnect();
    };
  }, []);

  return (
    <div
      aria-label="Contacto directo"
      className={`
        fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-[calc(1.25rem+env(safe-area-inset-right))] z-50
        sm:bottom-[calc(1.75rem+env(safe-area-inset-bottom))] sm:right-[calc(1.75rem+env(safe-area-inset-right))]
        transition-[opacity,scale] duration-ui ease-ui
        ${
          visible && !origenVisible && !pieVisible
            ? "scale-100 opacity-100 pointer-events-auto"
            : "scale-[0.96] opacity-0 pointer-events-none"
        }
      `}
    >
      <EnlaceCotizacion
        mensaje={textoFlotante()}
        ariaLabel="Consultar productos y solicitar cotización por WhatsApp"
        className="
          group relative
          flex items-center gap-3
          rounded-sm
          border border-stone/60
          bg-superficie/95
          py-2 pl-2 pr-4
          text-coffee no-underline
          transition-all duration-ui ease-ui
          hover:border-honey hover:scale-[var(--scale-boton)]
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-honey-profundo
          focus-visible:ring-offset-4
          focus-visible:ring-offset-pagina
          sm:gap-3.5 sm:py-2.25 sm:pl-2.5 sm:pr-4.5
        "
      >
        {/* Ícono principal */}
        <span
          className="
            relative flex h-11 w-11 shrink-0
            items-center justify-center
            rounded-full
            bg-origen
            text-superficie
            transition-colors duration-ui
            group-hover:bg-coffee-medio
            sm:h-12 sm:w-12
          "
        >
          <svg
            className="
              h-[21px] w-[21px]
              fill-current
            "
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>

          {/* Punto de identidad */}
          <span
            className="
              absolute bottom-0.5 right-0.5
              h-3 w-3 rounded-full
              border-2 border-superficie
              bg-honey
            "
            aria-hidden="true"
          />
        </span>

        {/* Mensaje */}
        <span className="flex min-w-0 flex-col items-start gap-0.5">
          <span
            className="
              text-label font-semibold
              uppercase tracking-[0.12em]
              text-honey-texto
            "
          >
            Cafeto Sierra Alta
          </span>

          <span
            className="
              whitespace-nowrap
              text-small font-semibold
              leading-tight tracking-tight
              text-coffee
              transition-colors duration-ui
              group-hover:text-coffee-medio
            "
          >
            Hablemos de tu pedido
          </span>

          <span
            className="
              hidden text-label
              leading-tight text-tinta-suave
              sm:block
            "
          >
            Cotiza directamente por WhatsApp
          </span>
        </span>

        {/* Indicador de acción */}
        <span
          className="
            ml-1 flex h-8 w-8 shrink-0
            items-center justify-center
            rounded-full
            text-honey-texto
            transition-colors duration-ui
            group-hover:bg-origen-claro
          "
          aria-hidden="true"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 17 17 7M7 7h10v10" />
          </svg>
        </span>
      </EnlaceCotizacion>
    </div>
  );
}