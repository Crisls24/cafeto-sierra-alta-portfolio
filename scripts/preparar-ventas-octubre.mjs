import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const importe = z.number().int().min(0);
const esquema = z.object({
  periodo: z.literal("2026-10"), fuente: z.string(),
  ventas: z.array(z.object({
    clave: z.string().regex(/^octubre-2026-\d{2}$/),
    fecha: z.string().regex(/^2026-10-(0[1-9]|[12]\d|3[01])$/),
    fechaAproximada: z.boolean(), ventaVendedora: z.boolean(),
    canal: z.enum(["presencial", "facebook", "otro"]),
    totalCentavos: importe, envioCentavos: importe, nota: z.string(),
    items: z.array(z.object({
      nombreProducto: z.string().min(1), nombrePresentacion: z.string().min(1),
      cantidad: z.number().int().positive(), precioUnitarioCentavos: importe.nullable(),
      pesoGramos: z.number().int().positive(),
    })).min(1),
  })).length(19),
});
const sql = (valor) => valor === null ? "NULL" : typeof valor === "number" ? String(valor) : `'${String(valor).replaceAll("'", "''")}'`;

export function prepararOctubre(entrada, estados) {
  const datos = esquema.parse(entrada);
  const pago = z.enum(["pendiente", "pagado"]).parse(estados.pago);
  const entrega = z.enum(["por_preparar", "listo", "entregado"]).parse(estados.entrega);
  if (new Set(datos.ventas.map((v) => v.clave)).size !== datos.ventas.length) throw new Error("Claves de importación repetidas.");
  const sentencias = [];
  for (const venta of datos.ventas) {
    const incompleta = venta.items.some((i) => i.precioUnitarioCentavos === null);
    const suma = venta.items.reduce((s, i) => s + i.cantidad * (i.precioUnitarioCentavos ?? 0), 0) + venta.envioCentavos;
    if (!incompleta && suma !== venta.totalCentavos) throw new Error(`No concilia ${venta.clave}.`);
    if (venta.envioCentavos > venta.totalCentavos) throw new Error(`Envío inválido: ${venta.clave}.`);
    const fechaEstado = `${venta.fecha}T12:00:00.000Z`;
    const nota = [venta.clave, venta.fechaAproximada ? "Fecha aprox." : "Fecha confirmada.", venta.nota].filter(Boolean).join(" ");
    const campos = [venta.clave, venta.canal, nota, venta.fecha, entrega, entrega === "entregado" ? 1 : 0,
      entrega === "entregado" ? fechaEstado : null, pago, pago === "pagado" ? fechaEstado : null,
      venta.ventaVendedora ? 1 : 0, venta.fechaAproximada ? 1 : 0,
      incompleta ? venta.totalCentavos : null, venta.envioCentavos, venta.clave, venta.envioCentavos > 0 ? 1 : 0];
    sentencias.push(`INSERT INTO pedidos (id,folio,canal,referencia,vendido_en,estado_entrega,entregado,entregado_en,estado_pago,pagado_en,venta_vendedora,fecha_aproximada,total_reportado_centavos,envio_centavos,importacion_clave,por_paqueteria)
VALUES (${sql(campos[0])},(SELECT COALESCE(MAX(folio),0)+1 FROM pedidos),${campos.slice(1).map(sql).join(",")}) ON CONFLICT(id) DO NOTHING;`);
    venta.items.forEach((item, indice) => {
      const valores = [`${venta.clave}-item-${indice}`, venta.clave, item.nombreProducto, item.nombrePresentacion, item.cantidad, item.precioUnitarioCentavos, indice];
      sentencias.push(`INSERT INTO pedido_items (id,pedido_id,nombre_producto,nombre_presentacion,cantidad,precio_unitario_centavos,orden) VALUES (${valores.map(sql).join(",")}) ON CONFLICT(id) DO NOTHING;`);
    });
    sentencias.push(`INSERT INTO auditoria (id,actor,accion,entidad,entidad_id,detalle) VALUES (${sql(`${venta.clave}-auditoria`)},'carga-octubre-2026','importar_venta','pedido',${sql(venta.clave)},${sql(JSON.stringify({ fuente: datos.fuente, clave: venta.clave, fechaAproximada: venta.fechaAproximada }))}) ON CONFLICT(id) DO NOTHING;`);
  }
  return sentencias.join("\n");
}

export function prepararCatalogo(formatos) {
  return z.array(z.object({ id: z.string(), productoId: z.string(), nombre: z.string(), precioCentavos: importe, orden: z.number().int() })).parse(formatos).map((f) =>
    `INSERT INTO presentaciones (id,producto_id,nombre,precio_centavos,orden) VALUES (${[f.id,f.productoId,f.nombre,f.precioCentavos,f.orden].map(sql).join(",")}) ON CONFLICT DO NOTHING;`
  ).join("\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const opcion = (nombre) => process.argv.includes(nombre) ? process.argv[process.argv.indexOf(nombre) + 1] : undefined;
  const entrada = resolve(raiz, opcion("--archivo") ?? "private/ventasOctubre2026.json");
  const datos = esquema.parse(JSON.parse(readFileSync(entrada, "utf8")));
  const carpeta = resolve(raiz, opcion("--salida") ?? ".wrangler/cargas/octubre-2026");
  mkdirSync(carpeta, { recursive: true });
  const formatos = JSON.parse(readFileSync(resolve(raiz, "src/data/presentacionesAdmin.json"), "utf8"));
  writeFileSync(resolve(carpeta, "catalogo.sql"), prepararCatalogo(formatos));
  const resumen = { ventas: datos.ventas.length, totalCentavos: datos.ventas.reduce((s,v) => s+v.totalCentavos,0), bolsas: datos.ventas.flatMap(v=>v.items).reduce((s,i)=>s+i.cantidad,0), pesoGramos: datos.ventas.flatMap(v=>v.items).reduce((s,i)=>s+i.cantidad*i.pesoGramos,0), fechasAproximadas: datos.ventas.filter(v=>v.fechaAproximada).length };
  if (process.argv.includes("--pago") && process.argv.includes("--entrega")) {
    writeFileSync(resolve(carpeta, "ventas.sql"), prepararOctubre(datos, { pago: opcion("--pago"), entrega: opcion("--entrega") }));
    console.log(JSON.stringify({ ...resumen, archivo: resolve(carpeta, "ventas.sql"), estados: { pago: opcion("--pago"), entrega: opcion("--entrega") } }, null, 2));
  } else {
    console.log(JSON.stringify({ ...resumen, estado: "Preparación: falta confirmar --pago y --entrega. No se escribió SQL de ventas." }, null, 2));
  }
}
