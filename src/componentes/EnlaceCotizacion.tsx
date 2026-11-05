import { EMPRESA } from "../data/empresa";
import { PENDIENTE } from "../data/tipos";
import { enlaceWhatsApp } from "../lib/whatsapp";

type Props = {
  /** El mensaje ya redactado; el componente solo se encarga del enlace. */
  mensaje: string;
  children: React.ReactNode;
  className?: string;
  /** Nombre accesible cuando el texto visible no basta para saber qué cotiza. */
  ariaLabel?: string;
};

/**
 * El único botón de cotización del sitio.
 *
 * Existe porque hay un problema que ninguna tarjeta puede resolver por su
 * cuenta: `EMPRESA.whatsapp` sigue en PENDIENTE, y `generarEnlaceWhatsApp`
 * devuelve `"#"` cuando el número no está. Eso convertía **todos** los
 * botones de cotización ---las tres tarjetas de café, la de queso, la de
 * miel y el botón flotante--- en enlaces que no hacían nada: el peor caso de
 * un control que aparenta funcionar.
 *
 * La regla es una sola: si el número está confirmado se abre WhatsApp con el
 * mensaje; si no, el control **no se presenta como pulsable**. Se muestra
 * como una etiqueta con el número pendiente, porque un sitio de ventas sin
 * WhatsApp es un sitio incompleto y esconderlo solo hace que el hueco se
 * descubra tarde. En cuanto la clienta confirme el número, los botones
 * empiezan a funcionar sin tocar ni un componente.
 */
export default function EnlaceCotizacion({
  mensaje,
  children,
  className = "",
  ariaLabel,
}: Props) {
  const disponible = EMPRESA.whatsapp !== PENDIENTE;

  if (!disponible) {
    return (
      <span
        className={`flex min-h-11 w-full flex-col items-center justify-center gap-0.5 rounded-sm border border-stone px-4 py-2 text-center ${className}`}
      >
        <span className="text-small text-tinta-suave">{children}</span>
        <span className="text-label uppercase text-honey-texto">
          WhatsApp por confirmar
        </span>
      </span>
    );
  }

  return (
    <a
      href={enlaceWhatsApp(mensaje)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </a>
  );
}