// Genera las imágenes optimizadas que sirve el sitio.
//
// El proyecto usa `output: "export"`, así que `next/image` no optimiza en
// tiempo de petición: sirve el archivo tal cual. Este script hace ese trabajo
// en el build, antes de compilar, y deja en `public/images` versiones WebP
// ligeras (RNF-01: ninguna imagen por encima de 200 kB) y un JPEG 1200x630
// para la tarjeta de compartir (Open Graph), que WhatsApp y Facebook prefieren
// en JPEG.
//
// Se ejecuta solo con `npm run build` (script `prebuild`). Para correrlo a
// mano: `npm run optimizar-imagenes`.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DIR_IMAGENES = path.join(process.cwd(), "public", "images");

/** Anchos a probar, de mayor a menor. Ninguna imagen se agranda. */
const ANCHOS = [1600, 1440, 1280, 1120, 960, 800];

/** Peso objetivo del WebP final, en bytes. */
const PESO_OBJETIVO = 200 * 1024;

/** Calidades a probar, de mayor a menor, hasta bajar del peso objetivo. */
const CALIDADES = [82, 78, 74, 70, 66, 62, 58, 54, 50, 46, 42];

/** Convierte un nombre de archivo en un slug de URL estable. */
function slug(nombre) {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Codifica en WebP buscando el mayor ancho posible que cumpla el peso objetivo.
 *
 * Primero baja la calidad a ancho completo; si ni con la calidad mínima cabe,
 * reduce el ancho y vuelve a empezar. Así una foto de mucho detalle termina más
 * pequeña, pero nunca por encima de 200 kB (RNF-01).
 */
async function optimizar(entrada) {
  let resultado = null;

  for (const ancho of ANCHOS) {
    for (const calidad of CALIDADES) {
      const buffer = await sharp(entrada)
        .rotate()
        .resize({ width: ancho, withoutEnlargement: true })
        .webp({ quality: calidad, effort: 5 })
        .toBuffer();

      resultado = { buffer, calidad, ancho };
      if (buffer.length <= PESO_OBJETIVO) return resultado;
    }
  }

  return resultado;
}

async function main() {
  const archivos = fs
    .readdirSync(DIR_IMAGENES)
    .filter(
      (f) =>
        /\.(jpe?g|png)$/i.test(f) &&
        !f.toLowerCase().startsWith("og-") &&
        !f.toLowerCase().includes("favicon")
    );

  if (archivos.length === 0) {
    console.log("No hay imágenes fuente en public/images.");
    return;
  }

  console.log("Optimizando imágenes a WebP:");
  for (const archivo of archivos) {
    const entrada = path.join(DIR_IMAGENES, archivo);
    const destino = path.join(DIR_IMAGENES, `${slug(archivo)}.webp`);
    const { buffer, calidad, ancho } = await optimizar(entrada);
    fs.writeFileSync(destino, buffer);
    const kb = (buffer.length / 1024).toFixed(1);
    console.log(`  ${archivo} -> ${path.basename(destino)} (${kb} KB, q${calidad}, ${ancho}px)`);
  }

  const fuenteOg = path.join(DIR_IMAGENES, "portada-hero.jpg");
  if (fs.existsSync(fuenteOg)) {
    const destinoOg = path.join(DIR_IMAGENES, "og-cafeto.jpg");
    await sharp(fuenteOg)
      .rotate()
      .resize(1200, 630, { fit: "cover", position: "center" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(destinoOg);
    console.log("  portada-hero.jpg -> og-cafeto.jpg (Open Graph 1200x630)");
  }

  // El favicon es la pestaña del navegador, no una foto del sitio: se sirve
  // en PNG y pequeño. Next.js lo toma de `src/app/icon.png` y lo publica como
  // `/icon.png`; generarlo aquí mantiene un único original en `public/images`.
  const fuenteFavicon = ["sin_fondo_favicon.png", "Sin_fondo_favicon.png", "Favicon_Definitivo.png", "favicon.png"]
    .map((f) => path.join(DIR_IMAGENES, f))
    .find((p) => fs.existsSync(p));
  if (fuenteFavicon) {
    const destinoFavicon = path.join(process.cwd(), "src", "app", "icon.png");
    const destinoPublico = path.join(process.cwd(), "public", "icon.png");
    const bufferFavicon = await sharp(fuenteFavicon)
      .rotate()
      // Recorta el margen transparente para que el glifo toque los bordes,
      // luego fuerza el cuadrado: el favicon se ve al máximo en la pestaña.
      .trim({ threshold: 1 })
      .resize(96, 96, { fit: "fill" })
      .png({ compressionLevel: 9 })
      .toBuffer();
    fs.writeFileSync(destinoFavicon, bufferFavicon);
    fs.writeFileSync(destinoPublico, bufferFavicon);
    const kb = (bufferFavicon.length / 1024).toFixed(1);
    console.log(`  ${path.basename(fuenteFavicon)} -> src/app/icon.png & public/icon.png (${kb} KB, 96x96)`);
  }
}

main().catch((error) => {
  console.error("Falló la optimización de imágenes:", error);
  process.exit(1);
});
