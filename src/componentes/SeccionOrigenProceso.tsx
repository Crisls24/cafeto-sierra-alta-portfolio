"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Diapositiva = {
  id: string;
  /** Nombre corto de la etapa, el que se lee en el recorrido. */
  paso: string;
  image: string;
  title: string;
  description: string;
  objectPosition?: string;
  datos: { valor: string; etiqueta: string }[];
};

const DIAPOSITIVAS: Diapositiva[] = [
  {
    id: "01",
    paso: "Altura y clima",
    image: "/images/slide-01.webp",
    title: "Nacido a 1,200 msnm entre neblina",
    description:
      "En la Sierra Hidalguense, el clima fresco ralentiza la maduración del fruto.",
    objectPosition: "center 48%",
    datos: [
      { valor: "Sombra cítrica", etiqueta: "Cultivo" },
      { valor: "Notas florales y acidez brillante", etiqueta: "En taza" },
    ],
  },
  {
    id: "02",
    paso: "Cuidado de la planta",
    image: "/images/slide-02.webp",
    title: "Cuidado desde el vivero",
    description:
      "Al proteger cada planta bajo malla sombra en cooperativa, garantizamos un grano de maduración lenta: una taza de acidez limpia, sin amargor y más suave para el consumo diario en tu empresa.",
    objectPosition: "center 50%",
    datos: [
      { valor: "Familiar", etiqueta: "Cooperativa" },
      { valor: "Malla sombra", etiqueta: "Protección" },
      { valor: "Desde semilla", etiqueta: "Cuidado" },
    ],
  },
  {
    id: "03",
    paso: "Secado y reposo",
    image: "/images/slide-03.webp",
    title: "Secado en camas elevadas y reposo",
    description:
      "El grano se seca al aire libre sobre mesas elevadas, sin tocar el suelo. Posteriormente descansa en verde para estabilizar su humedad y afianzar aromas de origen.",
    objectPosition: "center 48%",
    datos: [
      { valor: "Elevadas", etiqueta: "Camas" },
      { valor: "Al aire", etiqueta: "Secado" },
      { valor: "En verde", etiqueta: "Reposo" },
    ],
  },
  {
    id: "04",
    paso: "Selección y molienda",
    image: "/images/slide-04.webp",
    title: "Inspección manual y molienda al momento",
    description:
      "Cada lote se inspecciona manualmente antes del empaque. Conservamos el café en grano entero y solo lo molemos según tu especificación al recibir tu pedido.",
    objectPosition: "center 50%",
    datos: [
      { valor: "Pergamino / verde", etiqueta: "Selección" },
      { valor: "Grano entero", etiqueta: "Conservación" },
      { valor: "Al pedido", etiqueta: "Molienda" },
    ],
  },
];

const INTERVALO_MS = 6000;

/** Cuánto debe moverse el dedo para contar como swipe, en px. */
const DISTANCIA_SWIPE = 48;

export default function SeccionOrigenProceso() {
  const [diapositivaActual, setDiapositivaActual] = useState(0);

  const [autoplay] = useState(true);
  const [enPausa, setEnPausa] = useState(false);
  const [pausaManual, setPausaManual] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  // El swipe es la navegación táctil del carrusel en dispositivos móviles
  const inicioTactil = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sincronizar = () => setReduceMotion(consulta.matches);
    sincronizar();
    consulta.addEventListener("change", sincronizar);
    return () => consulta.removeEventListener("change", sincronizar);
  }, []);

  const corriendo = autoplay && !enPausa && !pausaManual && !reduceMotion;

  useEffect(() => {
    if (!corriendo) return;

    const intervalo = window.setInterval(() => {
      setDiapositivaActual((actual) => (actual + 1) % DIAPOSITIVAS.length);
    }, INTERVALO_MS);

    return () => window.clearInterval(intervalo);
  }, [corriendo]);

  const activa = DIAPOSITIVAS[diapositivaActual] ?? DIAPOSITIVAS[0]!;

  const avanzar = (direccion: number) => {
    setDiapositivaActual((actual) =>
      (actual + direccion + DIAPOSITIVAS.length) % DIAPOSITIVAS.length
    );
  };

  const alTocar = (evento: React.PointerEvent) => {
    inicioTactil.current = { x: evento.clientX, y: evento.clientY };
  };

  const alSoltar = (evento: React.PointerEvent) => {
    const inicio = inicioTactil.current;
    inicioTactil.current = null;
    if (!inicio) return;

    const dx = evento.clientX - inicio.x;
    const dy = evento.clientY - inicio.y;

    // Un gesto más vertical que horizontal es scroll, no cambio de slide.
    if (Math.abs(dx) < DISTANCIA_SWIPE || Math.abs(dx) < Math.abs(dy) * 1.4) {
      return;
    }

    avanzar(dx < 0 ? 1 : -1);
  };

  return (
    <div className="w-full">
      {/* 1. Encabezado de la sección con estilo editorial y acento miel */}
      <div className="mb-4 sm:mb-5 lg:mb-6">
        <h2 className="reveal-texto font-titulos text-h2 font-medium leading-tight text-coffee">
          El origen se disfruta en cada detalle.
        </h2>
        <div
          className="mt-2.5 h-[2px] w-8 rounded-full bg-honey"
          aria-hidden="true"
        />
      </div>

      {/* 1.b Recorrido numerado: cada etapa nombra un paso del proceso.
          Muestra el detalle de la etapa activa; en móvil se envuelve. */}
      <nav
        aria-label="Etapas del proceso del café"
        className="mb-4 flex flex-wrap gap-x-6 gap-y-2.5 sm:mb-5 lg:mb-6"
      >
        {DIAPOSITIVAS.map((diapositiva, indice) => {
          const activa = indice === diapositivaActual;
          return (
            <button
              key={diapositiva.id}
              type="button"
              onClick={() => setDiapositivaActual(indice)}
              aria-current={activa ? "step" : undefined}
              className={`group inline-flex items-baseline gap-2 text-left transition-colors duration-ui ease-ui ${
                activa ? "text-coffee" : "text-tinta-suave hover:text-coffee"
              }`}
            >
              <span
                className={`text-label font-semibold tabular-nums ${
                  activa ? "text-honey-texto" : "text-tinta-suave/70"
                }`}
              >
                {diapositiva.id}
              </span>
              <span
                className={`border-b pb-0.5 text-small font-medium ${
                  activa ? "border-honey" : "border-transparent group-hover:border-stone"
                }`}
              >
                {diapositiva.paso}
              </span>
            </button>
          );
        })}
      </nav>

      {/* 2. Contenedor del carrusel con fotografía protagonista */}
      <div
        className="relative isolate mt-0"
        onPointerEnter={() => setEnPausa(true)}
        onPointerLeave={() => setEnPausa(false)}
        onFocusCapture={() => setEnPausa(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setEnPausa(false);
          }
        }}
      >
        <div
          className="origen-canvas reveal-foto relative w-full touch-pan-y overflow-hidden rounded-sm bg-coffee shadow-none"
          role="region"
          aria-roledescription="carrusel"
          aria-label="Altitud y proceso del café"
          onPointerDown={alTocar}
          onPointerUp={alSoltar}
          onPointerCancel={() => {
            inicioTactil.current = null;
          }}
        >
          {/* Capas fotográficas con transición suave */}
          {DIAPOSITIVAS.map((diapositiva, indice) => (
            <div
              key={diapositiva.id}
              className={`absolute inset-0 transition-[opacity,scale] duration-crossfade ease-cine ${
                indice === diapositivaActual
                  ? "z-10 scale-100 opacity-100"
                  : "z-0 scale-[var(--scale-imagen-suave)] opacity-0"
              }`}
              aria-hidden={indice !== diapositivaActual}
            >
              <Image
                src={diapositiva.image}
                alt={diapositiva.title}
                fill
                priority={indice === 0}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1200px"
                className="object-cover"
                style={{ objectPosition: diapositiva.objectPosition ?? "center 50%" }}
              />
            </div>
          ))}

          {/* Velo degradado editorial (nace en la esquina inferior izquierda) */}
          <div
            className="origen-scrim pointer-events-none absolute inset-0 z-20"
            aria-hidden="true"
          />

          {/* 3. Contenido editorial integrado en la esquina inferior izquierda */}
          <div className="absolute inset-x-0 bottom-0 z-30 p-5 sm:p-7 lg:p-9 text-left pointer-events-none">
            <div className="max-w-xl lg:max-w-2xl pointer-events-auto">
              {/* Pequeño acento horizontal color miel */}
              <div
                className="mb-2.5 h-[2px] w-7 rounded-full bg-honey sm:mb-3"
                aria-hidden="true"
              />

              <h3 className="font-titulos text-[1.22rem] font-medium leading-tight text-superficie drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] sm:text-[1.5rem] lg:text-[1.75rem]">
                {activa.title}
              </h3>

              <p className="mt-1.5 max-w-lg text-[0.8rem] leading-relaxed text-superficie/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] sm:mt-2 sm:text-small">
                {activa.description}
              </p>

              {/* Fichas de datos verificables */}
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 sm:mt-3.5">
                {activa.datos.map((dato) => (
                  <span
                    key={dato.etiqueta}
                    className="inline-flex items-center text-[0.66rem] text-superficie/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] sm:text-[0.72rem]"
                  >
                    <span className="font-semibold text-superficie">{dato.valor}</span>
                    <span className="ml-1 text-superficie/70">· {dato.etiqueta}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Flechas de navegación minimalistas */}
          <button
            type="button"
            onClick={() => avanzar(-1)}
            className="absolute left-2.5 top-1/2 z-40 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-superficie/20 bg-coffee/40 text-superficie/80 backdrop-blur-sm transition-all duration-ui hover:border-superficie/50 hover:bg-coffee/70 hover:text-superficie focus-visible:outline-2 focus-visible:outline-honey sm:left-4 sm:h-9 sm:w-9"
            aria-label="Slide anterior"
          >
            <ChevronLeft aria-hidden="true" size={18} />
          </button>

          <button
            type="button"
            onClick={() => avanzar(1)}
            className="absolute right-2.5 top-1/2 z-40 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-superficie/20 bg-coffee/40 text-superficie/80 backdrop-blur-sm transition-all duration-ui hover:border-superficie/50 hover:bg-coffee/70 hover:text-superficie focus-visible:outline-2 focus-visible:outline-honey sm:right-4 sm:h-9 sm:w-9"
            aria-label="Slide siguiente"
          >
            <ChevronRight aria-hidden="true" size={18} />
          </button>

          {/* 5. Control de pausa del autoplay. La navegación entre etapas
              vive en el recorrido numerado, arriba de la fotografía. */}
          <button
            type="button"
            onClick={() => setPausaManual((pausa) => !pausa)}
            className="absolute bottom-3 right-3 z-40 inline-flex h-8 w-8 items-center justify-center rounded-full border border-superficie/15 bg-coffee/35 text-superficie/70 backdrop-blur-[2px] transition-colors duration-ui hover:text-superficie focus-visible:outline-2 focus-visible:outline-honey sm:bottom-4 sm:right-4"
            aria-label={pausaManual ? "Reanudar carrusel" : "Pausar carrusel"}
          >
            {pausaManual ? <Play size={12} /> : <Pause size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
}