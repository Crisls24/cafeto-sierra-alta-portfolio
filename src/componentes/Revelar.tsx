"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  children?: ReactNode;
  /** Fracción de la composición que debe entrar en el viewport. */
  umbral?: number;
  className?: string;
};

export default function Revelar({ children, umbral = 0.15, className }: Props) {
  const referencia = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const nodo = referencia.current;
    if (!nodo) return;

    if (typeof IntersectionObserver === "undefined") {
      const marco = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(marco);
    }

    const alto = nodo.getBoundingClientRect().height;
    const efectivo = Math.min(
      umbral,
      (window.innerHeight * 0.35) / Math.max(alto, 1)
    );

    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) {
          setVisible(true);
          observador.disconnect();
        }
      },
      { threshold: efectivo }
    );

    observador.observe(nodo);
    return () => observador.disconnect();
  }, [umbral]);

  return (
    <div
      ref={referencia}
      data-visible={visible ? "true" : undefined}
      className={`revelar${className ? ` ${className}` : ""}`}
    >
      {children}
    </div>
  );
}
