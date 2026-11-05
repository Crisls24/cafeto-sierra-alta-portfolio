import { Star } from "lucide-react";

/** La silueta sigue siendo la estrella del sitio; el gesto se revela al elegir. */
export default function EstrellaResena({ valor, activa, elegida }: { valor: number; activa: boolean; elegida: boolean }) {
  const bocas = [
    "M9 14 Q12 11.5 15 14",
    "M9.5 13.5 Q12 12.5 14.5 13.2",
    "M10 13.25 H14",
    "M9 12.5 Q12 16 15 12.5",
    "M9 12.5 Q12 16.5 15 12.5",
  ];

  return <Star aria-hidden="true" data-expresion={elegida ? valor : undefined} strokeWidth={1.5} className={activa ? "resena-estrella size-full fill-honey text-honey-profundo" : "resena-estrella size-full fill-honey/10 text-honey-profundo group-hover:text-honey-profundo"}>
    {elegida && <g className="resena-estrella-gesto text-coffee" fill="none" strokeWidth={0.95} strokeLinecap="round">
      <g className="resena-estrella-cara" data-animo={valor <= 2 ? "serio" : "alegre"}>
        <g className={valor === 5 ? "resena-ojo" : "resena-ojo resena-ojo-parpadeo"}>
          {valor === 4 ? <path d="M9 10.8 Q10 9.5 11 10.8" /> : valor === 5 ? <>
            <circle cx={10} cy={10.5} r={0.65} fill="currentColor" stroke="none" className="resena-ojo-guino-abierto" />
            <path d="M9 10.8 Q10 9.5 11 10.8" className="resena-ojo-guino-cerrado" />
          </> : <circle cx={10} cy={10.5} r={0.65} fill="currentColor" stroke="none" />}
        </g>
        <g className={valor === 5 ? "resena-ojo" : "resena-ojo resena-ojo-parpadeo"}>
          {valor === 4 ? <path d="M13 10.8 Q14 9.5 15 10.8" /> : <circle cx={14} cy={10.5} r={0.65} fill="currentColor" stroke="none" />}
        </g>
        <path d={bocas[valor - 1]} className="resena-boca" />
      </g>
      {valor === 5 && <path d="M19.5 1.5 V4.5 M18 3 H21" className="resena-destello stroke-honey-profundo" />}
    </g>}
  </Star>;
}
