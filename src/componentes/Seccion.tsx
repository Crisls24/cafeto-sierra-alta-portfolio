import EtiquetaSeccion from "./EtiquetaSeccion";
import Revelar from "./Revelar";

type Props = {
  id: string;
  numero: string;
  etiqueta: string;
  titulo: string;
  mostrarEtiqueta?: boolean;
  compacto?: boolean;
  anchoAmplio?: boolean;
  encabezadoCompacto?: boolean;
  espaciadoReducido?: boolean;
  /** Segunda línea del encabezado. Solo la llevan las secciones que la necesitan. */
  bajada?: string;
  children?: React.ReactNode;
};

/**
 * El molde de todas las secciones de la página: etiqueta de expediente,
 * título y contenido.
 *
 * Vive en un solo lugar para que las once secciones se numeren, se
 * titulen y se separen igual. Si cada bloque trae su propio encabezado,
 * dos bloques dejan de coincidir y nadie lo nota hasta que ya está
 * publicado.
 */
export default function Seccion({
  id,
  numero,
  etiqueta,
  titulo,
  bajada,
  children,
  mostrarEtiqueta = true,
  compacto = false,
  anchoAmplio = false,
  encabezadoCompacto = false,
  espaciadoReducido = false,
}: Props) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 ${espaciadoReducido ? "pt-4 pb-2 sm:pt-5 sm:pb-2" : compacto ? "py-5 sm:py-7" : "py-6 lg:py-8"}`}
    >
      <div className={`mx-auto w-full ${compacto && !anchoAmplio ? "max-w-5xl" : "max-w-sitio"} px-4 sm:px-8`}>
        <Revelar>
          {mostrarEtiqueta && etiqueta && <EtiquetaSeccion numero={numero} titulo={etiqueta} />}
          {titulo && (
            <h2 className={`reveal-texto prose ${encabezadoCompacto ? "text-[28px] leading-9" : "text-h2"} ${mostrarEtiqueta ? "mt-4 " : ""}text-coffee`}>
              {titulo}
            </h2>
          )}
          {bajada && (
            <p className={`reveal-texto prose ${compacto ? "mt-2" : "mt-4"} text-body text-coffee-medio`}>
              {bajada}
            </p>
          )}
          {children}
        </Revelar>
      </div>
    </section>
  );
}