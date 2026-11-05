import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const centavos = z.number().int().nonnegative();
const compra = z.object({ pesoGramos: z.number().int().positive(), gasolinaCentavos: centavos });
const esquema = z.object({
  fuente: z.string().min(1), cafeTostadoPorKiloCentavos: centavos, alcance: z.string().min(1),
  compras: z.object({ actual: compra, octubre: compra }),
  presentaciones: z.array(z.object({
    nombre: z.enum(["250 g", "500 g", "1 kg", "35 g"]), pesoGramos: z.number().int().positive(),
    bolsaCentavos: centavos.nullable(), etiquetaFrenteCentavos: centavos.nullable(), etiquetaAtrasCentavos: centavos.nullable(),
  })),
  gastosOctubre: z.array(z.object({ id: z.string().min(1), concepto: z.string().min(1), tipo: z.enum(["equipo", "operativo"]), importeCentavos: centavos.nullable() })),
  costoEnvioOctubreCentavos: centavos.nullable(),
});
const pesos = { "250 g": 250, "500 g": 500, "1 kg": 1000, "35 g": 35 };
const sql = v => v === null ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replaceAll("'", "''")}'`;

/** Preparación sin escrituras: cada compra tiene su propia gasolina por gramo. */
export function prepararCostosCafe(entrada, ventasOctubre) {
  const datos = esquema.parse(entrada);
  if (new Set(datos.presentaciones.map(p => p.nombre)).size !== datos.presentaciones.length) throw new Error("Presentaciones repetidas.");
  const costos = lote => datos.presentaciones.map(p => {
    if (p.pesoGramos !== pesos[p.nombre]) throw new Error(`Peso incorrecto: ${p.nombre}.`);
    const empaque = [p.bolsaCentavos, p.etiquetaFrenteCentavos, p.etiquetaAtrasCentavos];
    return { nombre: p.nombre, costoCentavos: empaque.some(c => c === null) ? null : Math.round(
      datos.cafeTostadoPorKiloCentavos * p.pesoGramos / 1000 + empaque.reduce((s, c) => s + c, 0) + lote.gasolinaCentavos * p.pesoGramos / lote.pesoGramos
    ) };
  });
  const resumen = costos(datos.compras.actual), historicos = costos(datos.compras.octubre);
  const catalogoSql = resumen.filter(p => p.costoCentavos !== null).map(p =>
    `UPDATE presentaciones SET costo_centavos = ${p.costoCentavos} WHERE nombre = ${sql(p.nombre)} AND producto_id IN ('cafe-lavado', 'cafe-honey', 'cafe-natural');`
  ).join("\n");
  const sentencias = [];
  if (ventasOctubre) {
    for (const venta of ventasOctubre.ventas) {
      if (!/^octubre-2026-\d{2}$/.test(venta.clave)) throw new Error("Venta ajena a la carga de octubre.");
      venta.items.forEach((item, indice) => {
        const costo = historicos.find(p => p.nombre === item.nombrePresentacion)?.costoCentavos;
        if (costo == null) return;
        if (item.pesoGramos !== pesos[item.nombrePresentacion]) throw new Error("Peso histórico distinto del confirmado.");
        sentencias.push(`UPDATE pedido_items SET costo_unitario_centavos = ${costo}
WHERE id = ${sql(`${venta.clave}-item-${indice}`)} AND pedido_id = ${sql(venta.clave)}
AND nombre_producto = ${sql(item.nombreProducto)} AND nombre_presentacion = ${sql(item.nombrePresentacion)}
AND cantidad = ${sql(item.cantidad)} AND precio_unitario_centavos IS ${sql(item.precioUnitarioCentavos)}
AND costo_unitario_centavos IS NULL;`);
      });
    }
    const envio = ventasOctubre.ventas.find(v => v.clave === 'octubre-2026-15' && v.envioCentavos > 0);
    if (envio) sentencias.push(`UPDATE pedidos SET costo_envio_centavos = ${sql(datos.costoEnvioOctubreCentavos)} WHERE importacion_clave = ${sql(envio.clave)} AND por_paqueteria = 1 AND envio_centavos = ${sql(envio.envioCentavos)} AND costo_envio_centavos IS NULL;`);
  }
  for (const gasto of datos.gastosOctubre) {
    sentencias.push(`INSERT INTO gastos_mensuales(id,periodo,concepto,tipo,importe_centavos,fuente) VALUES (${[gasto.id,"2026-10",gasto.concepto,gasto.tipo,gasto.importeCentavos,datos.fuente].map(sql).join(",")}) ON CONFLICT(id) DO NOTHING;`);
  }
  return { resumen, historicos, catalogoSql, octubreSql: sentencias.join("\n"), alcance: datos.alcance };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const opcion = nombre => process.argv.includes(nombre) ? process.argv[process.argv.indexOf(nombre) + 1] : undefined;
  const datos = JSON.parse(readFileSync(resolve(raiz, opcion("--costos") ?? "private/costosCafe.json"), "utf8"));
  const ventas = JSON.parse(readFileSync(resolve(raiz, opcion("--ventas") ?? "private/ventasOctubre2026.json"), "utf8"));
  const preparado = prepararCostosCafe(datos, ventas);
  const carpeta = resolve(raiz, opcion("--salida") ?? ".wrangler/cargas/costos-cafe");
  mkdirSync(carpeta, { recursive: true });
  writeFileSync(resolve(carpeta, "catalogo.sql"), preparado.catalogoSql + "\n");
  writeFileSync(resolve(carpeta, "octubre.sql"), preparado.octubreSql + "\n");
  console.log(JSON.stringify({ ...preparado, catalogoSql: undefined, octubreSql: undefined, carpeta, aplicado: false }, null, 2));
}
