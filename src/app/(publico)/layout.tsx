import Encabezado from "@/componentes/Encabezado";

/**
 * Grupo de rutas públicas: portada y páginas de café. Comparte el encabezado
 * y el noscript de las animaciones. Cada página declara los datos
 * estructurados del contenido que muestra. Las rutas fuera
 * del grupo (`/admin`) se quedan en el cascarón desnudo del layout raíz.
 */
export default function LayoutPublico({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Encabezado />
      {children}
      <noscript>
        <style>{`.revelar:not([data-visible="true"]) .reveal-texto,.revelar:not([data-visible="true"]) .reveal-foto{opacity:1!important;transform:none!important}`}</style>
      </noscript>
    </>
  );
}
