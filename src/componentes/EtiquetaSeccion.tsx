type Props = {
  numero: string;
  titulo: string;
};

/**
 * La etiqueta de expediente `[ 01 / CATÁLOGO DE ORIGEN ]` del sistema.
 *
 * Es un componente y no una cadena escrita a mano en cada bloque porque
 * en cuanto alguien la escribe a mano, dos etiquetas dejan de coincidir.
 */
export default function EtiquetaSeccion({ numero, titulo }: Props) {
  return (
    <p className="reveal-texto text-label text-tinta-suave uppercase">
      <span className="cifras text-honey-texto">[{` ${numero} `}</span>
      <span aria-hidden="true">/</span>
      <span>{` ${titulo} `}</span>
      <span className="cifras text-honey-texto">]</span>
    </p>
  );
}
