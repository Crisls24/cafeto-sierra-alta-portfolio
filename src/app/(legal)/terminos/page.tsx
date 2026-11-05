import type { Metadata } from "next";

import PaginaLegal from "@/componentes/PaginaLegal";
import { TERMINOS } from "@/data/legal";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description:
    "Términos y Condiciones de cotización, pedido y entrega de los productos de Cafeto Sierra Alta.",
  alternates: { canonical: "/terminos" },
};

export default function PaginaTerminos() {
  return <PaginaLegal documento={TERMINOS} />;
}
