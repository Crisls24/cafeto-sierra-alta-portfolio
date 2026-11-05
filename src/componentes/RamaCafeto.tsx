type Props = {
  className?: string;
};

/**
 * Ilustración lineal de una rama de cafeto: tallo, hojas y cerezas, en el
 * estilo de grabado botánico de los empaques tradicionales de café.
 *
 * Es puramente decorativa y no aporta contenido: la marca el `aria-hidden`
 * y el contenedor que la usa decide su color (`currentColor`) y su opacidad.
 * No tiene relleno ni color propio, de modo que no introduce ningún valor
 * de color fuera del bloque `@theme` de `globals.css`.
 */
export default function RamaCafeto({ className }: Props) {
  return (
    <svg
      viewBox="0 0 240 240"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* Tallo principal, del extremo inferior izquierdo hacia arriba. */}
      <path d="M20 230 C 78 204 132 176 164 122 C 182 94 194 60 204 30" />

      {/* Ramas secundarias. */}
      <path d="M126 172 C 108 154 96 142 74 128" />
      <path d="M156 132 C 174 126 190 118 206 106" />
      <path d="M182 84 C 194 72 202 60 210 44" />

      {/* Hojas: elipse y nervadura central. */}
      <g>
        <ellipse cx="74" cy="188" rx="18" ry="6.5" transform="rotate(-42 92 188)" />
        <line x1="56" y1="188" x2="92" y2="188" transform="rotate(-42 92 188)" />
      </g>
      <g>
        <ellipse cx="112" cy="156" rx="17" ry="6" transform="rotate(-38 130 156)" />
        <line x1="95" y1="156" x2="130" y2="156" transform="rotate(-38 130 156)" />
      </g>
      <g>
        <ellipse cx="56" cy="128" rx="15" ry="5.5" transform="rotate(-46 74 128)" />
        <line x1="41" y1="128" x2="74" y2="128" transform="rotate(-46 74 128)" />
      </g>
      <g>
        <ellipse cx="100" cy="128" rx="14" ry="5" transform="rotate(-70 100 146)" />
        <line x1="100" y1="110" x2="100" y2="146" transform="rotate(-70 100 146)" />
      </g>
      <g>
        <ellipse cx="154" cy="108" rx="15" ry="5" transform="rotate(-30 172 108)" />
        <line x1="139" y1="108" x2="172" y2="108" transform="rotate(-30 172 108)" />
      </g>
      <g>
        <ellipse cx="206" cy="106" rx="16" ry="5.5" transform="rotate(12 206 106)" />
        <line x1="190" y1="106" x2="222" y2="106" transform="rotate(12 206 106)" />
      </g>
      <g>
        <ellipse cx="150" cy="178" rx="15" ry="5.5" transform="rotate(20 150 178)" />
        <line x1="134" y1="178" x2="166" y2="178" transform="rotate(20 150 178)" />
      </g>
      <g>
        <ellipse cx="210" cy="30" rx="14" ry="5" transform="rotate(-20 210 44)" />
        <line x1="210" y1="16" x2="210" y2="44" transform="rotate(-20 210 44)" />
      </g>

      {/* Dos pares de cerezas colgando de la rama superior. */}
      <path d="M186 52 C 184 44 186 36 192 30" />
      <path d="M186 52 C 190 58 192 63 192 69" />
      <circle cx="190" cy="75" r="6.5" />
      <path d="M186 52 C 199 54 205 58 207 64" />
      <circle cx="207" cy="70" r="6.5" />
    </svg>
  );
}
