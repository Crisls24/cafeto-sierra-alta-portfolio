import fs from "node:fs";
import path from "node:path";

// Next 16.3 convierte '/' a '.' para los nombres RSC. En Windows el export
// usa path.relative con '\\' y acaba creando subcarpetas __next.*.
// Publicamos también el nombre plano que solicita su propio router cliente.
export function normalizarExport(carpeta) {
  if (!fs.existsSync(carpeta)) return 0;
  let copiados = 0;
  function segmentos(directorio, destino, partes) {
    for (const entrada of fs.readdirSync(directorio, { withFileTypes: true })) {
      const origen = path.join(directorio, entrada.name);
      const nombres = [...partes, entrada.name];
      if (entrada.isDirectory()) segmentos(origen, destino, nombres);
      else if (entrada.isFile() && entrada.name.endsWith(".txt")) {
        const archivo = path.join(destino, nombres.join("."));
        const contenido = fs.readFileSync(origen);
        if (!fs.existsSync(archivo) || !fs.readFileSync(archivo).equals(contenido)) {
          fs.writeFileSync(archivo, contenido);
          copiados++;
        }
      }
    }
  }
  function recorrer(directorio) {
    for (const entrada of fs.readdirSync(directorio, { withFileTypes: true })) {
      if (!entrada.isDirectory()) continue;
      const origen = path.join(directorio, entrada.name);
      if (entrada.name.startsWith("__next.")) segmentos(origen, directorio, [entrada.name]);
      else recorrer(origen);
    }
  }
  recorrer(carpeta);
  return copiados;
}
