import { mensajeFlotante } from "../lib/whatsapp";

const PASOS = [
  {
    numero: "01",
    titulo: "Diagnóstico de consumo",
    descripcion: "Estimamos el volumen exacto según tus colaboradores o evento.",
  },
  {
    numero: "02",
    titulo: "Propuesta y CFDI",
    descripcion: "Cotización desglosada y comprobante fiscal para tu empresa.",
  },
  {
    numero: "03",
    titulo: "Surtido fresco",
    descripcion: "Entrega de grano o molido con fecha de tueste visible en bolsa.",
  },
];

export default function SeccionProceso() {
  return (
    <div className="reveal-texto mt-0 rounded-sm border border-coffee/20 bg-coffee px-5 py-5 text-superficie sm:px-8 sm:py-9 lg:px-10 lg:py-10">
      <h3 className="max-w-2xl font-titulos text-[1.7rem] leading-tight text-superficie sm:text-h2 lg:text-h2">
        Del mensaje a tu pedido.
      </h3>

      {/* Flujo de 3 Pasos */}
      <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-3 lg:items-start">
        {PASOS.map((paso, indice) => (
          <div key={paso.numero} className="flex items-start gap-3 lg:gap-4">
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-honey sm:text-label">
                {paso.numero}
              </p>
              <h4 className="mt-2 font-titulos text-[1.2rem] font-medium text-superficie sm:text-h3">
                {paso.titulo}
              </h4>
              <p className="mt-2 text-[0.92rem] leading-relaxed text-superficie/80 sm:text-small">
                {paso.descripcion}
              </p>
            </div>

            {indice < PASOS.length - 1 && (
              <div className="hidden pt-1 text-honey/60 lg:flex lg:items-center lg:justify-center">
                <span aria-hidden="true" className="text-h3 font-light">→</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Llamado a la acción con rol único: cerrar la compra */}
      <div className="mt-5 flex flex-col gap-4 border-t border-superficie/15 pt-4 md:mt-7 md:flex-row md:items-center md:justify-end md:gap-6 md:pt-5">

        <a
          href={mensajeFlotante()}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-sm bg-superficie px-6 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-coffee transition-all duration-ui ease-ui hover:scale-[var(--scale-boton)] hover:bg-superficie/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-honey focus-visible:ring-offset-2 focus-visible:ring-offset-coffee md:w-auto md:px-8 md:text-label"
        >
          Solicitar propuesta
        </a>
      </div>
    </div>
  );
}