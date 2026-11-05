import { PORTAFOLIO } from "../data/portafolio";

export default function AvisoDemostracion() {
  return <aside aria-label={PORTAFOLIO.aviso} className="border-b border-stone bg-superficie px-4 py-2 text-center text-small text-coffee">
    <span>{PORTAFOLIO.aviso}</span>{" · "}
    <a href={PORTAFOLIO.sitioReal} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-honey-texto underline">{PORTAFOLIO.enlace}</a>
  </aside>;
}
