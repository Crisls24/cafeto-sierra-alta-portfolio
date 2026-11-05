"use client";
import { useState } from "react";
import { TEXTOS_INICIO as T } from "../data/inicioAdmin";
import { centavosAPesos, fechaMX, type ResumenInicio } from "../lib/ventasAdmin";

export default function GraficaVentasAdmin({ puntos, cantidad }: { puntos: ResumenInicio["ventasPorDia"]; cantidad: number }) {
  const [activo, setActivo] = useState<number | null>(null);
  if (!cantidad) return <div className="flex min-h-48 items-center justify-center px-4 text-center text-small text-tinta-suave">{T.sinVentas}</div>;
  const maximo = Math.max(100, ...puntos.map((p) => p.totalCentavos));
  const unidad = 10 ** Math.floor(Math.log10(maximo));
  const max = Math.ceil(maximo / unidad) * unidad;
  const seleccionado = activo === null ? null : puntos[activo];
  const paso = Math.max(1, Math.ceil((puntos.length - 1) / 5));
  return <div className="admin-grafica relative mt-5">
    <div className="admin-grafica-escala" aria-hidden="true">
      {[1, 0.75, 0.5, 0.25, 0].map((fraccion) => <span key={fraccion}>{centavosAPesos(max * fraccion)}</span>)}
    </div>
    <div className="admin-grafica-trazado">
      <div className="admin-grafica-guias" aria-hidden="true">{[0, 1, 2, 3, 4].map((i) => <span key={i} />)}</div>
      <div className="admin-grafica-barras" style={{ gridTemplateColumns: `repeat(${puntos.length}, minmax(0, 1fr))` }}>
        {puntos.map((p, i) => <div key={p.fecha} className="flex h-full min-w-0 items-end justify-center">
          {p.totalCentavos > 0 && <button type="button" className="admin-barra-venta" style={{ height: `${p.totalCentavos / max * 100}%` }}
            aria-label={`${fechaMX(p.fecha)}: ${centavosAPesos(p.totalCentavos)}`}
            onMouseEnter={() => setActivo(i)} onMouseLeave={() => setActivo(null)} onFocus={() => setActivo(i)} onBlur={() => setActivo(null)} onClick={() => setActivo(activo === i ? null : i)} />}
        </div>)}
      </div>
      <div className="admin-grafica-fechas" aria-hidden="true">
        {puntos.map((p, i) => (i % paso === 0 || i === puntos.length - 1) && <span key={p.fecha} style={{ left: `${(i + 0.5) / puntos.length * 100}%`, transform: i === 0 ? "none" : i === puntos.length - 1 ? "translateX(-100%)" : "translateX(-50%)" }}>{fechaMX(p.fecha).replace(/\s+\d{4}$/, "")}</span>)}
      </div>
    </div>
    {seleccionado && <div className="admin-grafica-tooltip" role="status">{fechaMX(seleccionado.fecha)} · {centavosAPesos(seleccionado.totalCentavos)}</div>}
    <ul className="sr-only" aria-label={T.graficaDetalle}>{puntos.map((p) => <li key={p.fecha}>{fechaMX(p.fecha)}: {centavosAPesos(p.totalCentavos)}</li>)}</ul>
  </div>;
}
