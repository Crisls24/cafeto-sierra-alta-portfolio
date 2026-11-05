import type { Metadata } from "next";

import PaginaLegal from "@/componentes/PaginaLegal";
import { AVISO_PRIVACIDAD } from "@/data/legal";

export const metadata: Metadata = {
  title: "Aviso de Privacidad",
  description:
    "Aviso de Privacidad de Cafeto Sierra Alta conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.",
  alternates: { canonical: "/privacidad" },
};

export default function PaginaPrivacidad() {
  return <PaginaLegal documento={AVISO_PRIVACIDAD} />;
}
