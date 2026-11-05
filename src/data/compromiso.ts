import { CompromisoSocial } from "./tipos";

/**
 * El cierre editorial de la página: lo que hay detrás de cada producto.
 *
 * El texto es breve a propósito. La sección no repite el catálogo ni el
 * carrusel de origen: nombra a la comunidad detrás de la marca y sus tres
 * pilares. No se inventan cifras de impacto ni se presentan fotografías de
 * productores que la marca no haya entregado; si más adelante llegan datos
 * reales, se incorporan aquí sin tocar el componente.
 *
 * La panorámica es una fotografía propia. Si dejara de existir, la banda cae
 * al estado `color-origen-claro` del componente y la sección se sostiene
 * igual: la foto mejora la página, no la habilita.
 */
export const COMPROMISO: CompromisoSocial = {
  titulo: "Detrás de cada producto,\nhay una comunidad.",
  cuerpo:
    "Apoyamos el trabajo de los cafetaleros de la Sierra Hidalguense y buscamos que el valor del origen también se refleje en las comunidades que hacen posible cada producto.",
  pilares: [
    {
      id: "economia-local",
      titulo: "Economía local",
      descripcion: "Apoyo a los cafetaleros y al valor de su trabajo.",
    },
    {
      id: "inclusion",
      titulo: "Inclusión",
      descripcion:
        "Visibilizamos a las comunidades detrás de nuestros productos.",
    },
    {
      id: "empresas",
      titulo: "Valor para empresas",
      descripcion:
        "Productos con origen, identidad y compromiso que también pueden comunicar las empresas.",
    },
  ],
  foto: "/images/seccion-compromiso.webp",
  alt: "Cerezas de café en la rama de un cafeto de la Sierra Hidalguense",
};
