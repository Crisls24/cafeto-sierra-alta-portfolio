// Quita del export los formatos fuente que no se sirven.
//
// `public/images` guarda los JPG originales (fuente de verdad) y además los
// WebP optimizados por `prebuild`. `next build` copia la carpeta entera a
// `out/`, así que sin esta limpieza el deploy cargaría los JPG pesados (hay
// uno de 4.9 MB) que ninguna página referencia. Aquí se retiran del `out/`
// sin tocar `public/images`.

import fs from "node:fs";
import path from "node:path";
import { normalizarExport } from "./normalizar-export.mjs";

const segmentos = normalizarExport(path.join(process.cwd(), "out"));
if (segmentos) console.log(`Export: normalizados ${segmentos} segmentos de navegación.`);

const DIR_IMAGENES = path.join(process.cwd(), "out", "images");

if (!fs.existsSync(DIR_IMAGENES)) {
  process.exit(0);
}

const borrados = [];

for (const archivo of fs.readdirSync(DIR_IMAGENES)) {
  // Se conserva og-cafeto.jpg: es la imagen que la página referencia para
  // Open Graph/Twitter (WhatsApp y Facebook la prefieren en JPEG).
  if (archivo === "og-cafeto.jpg") {
    continue;
  }
  if (/\.(jpe?g|png)$/i.test(archivo) || archivo === "og-cafeto.webp") {
    fs.unlinkSync(path.join(DIR_IMAGENES, archivo));
    borrados.push(archivo);
  }
}

if (borrados.length > 0) {
  console.log(`Export limpio: fuera ${borrados.length} archivos fuente de out/images.`);
}
