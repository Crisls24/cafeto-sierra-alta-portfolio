import PaginaCafe from "@/componentes/PaginaCafe";
import { PAGINAS_CAFE } from "@/data/cafe";
import { metadataCafe } from "@/lib/seo";

export const metadata = metadataCafe(PAGINAS_CAFE.guia);

export default function Pagina() {
  return <PaginaCafe pagina={PAGINAS_CAFE.guia} />;
}
