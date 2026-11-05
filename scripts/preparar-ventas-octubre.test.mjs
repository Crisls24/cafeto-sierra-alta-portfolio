import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { prepararCatalogo, prepararOctubre } from "./preparar-ventas-octubre.mjs";

const datos = JSON.parse(readFileSync(new URL("../examples/ventas-octubre.demo.json", import.meta.url), "utf8"));
const formatos = JSON.parse(readFileSync(new URL("../src/data/presentacionesAdmin.json", import.meta.url), "utf8"));
const migraciones = readdirSync(new URL("../migrations/", import.meta.url)).filter(f => f.endsWith(".sql")).sort();
function base(hasta = migraciones.length) {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  for (const nombre of migraciones.slice(0, hasta)) db.exec(readFileSync(new URL(`../migrations/${nombre}`, import.meta.url), "utf8"));
  return db;
}
test("la migración conserva artículos existentes y sus relaciones", () => {
  const db = base(3);
  db.exec("INSERT INTO pedidos(id,folio) VALUES ('existente',1); INSERT INTO pedido_items(id,pedido_id,nombre_producto,nombre_presentacion,cantidad,precio_unitario_centavos) VALUES ('item','existente','Café','250 g',2,10000);");
  db.exec(readFileSync(new URL(`../migrations/${migraciones[3]}`, import.meta.url), "utf8"));
  assert.equal(db.prepare("SELECT SUM(cantidad*precio_unitario_centavos) AS total FROM pedido_items").get().total,20000);
  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length,0);
  db.close();
});
test("las ventas ficticias concilian total, cantidades, fechas, envío y precio a vendedora", () => {
  const db=base();
  db.exec(prepararCatalogo(formatos));
  db.exec(prepararOctubre(datos,{pago:"pagado",entrega:"entregado"}));
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM pedidos").get().n,19);
  const total=db.prepare("SELECT SUM(COALESCE(p.total_reportado_centavos,(SELECT SUM(cantidad*precio_unitario_centavos) FROM pedido_items WHERE pedido_id=p.id))) AS n FROM pedidos p").get().n;
  assert.equal(total,182700);
  assert.equal(db.prepare("SELECT SUM(cantidad) AS n FROM pedido_items").get().n,20);
  assert.equal(db.prepare("SELECT SUM(envio_centavos) AS n FROM pedidos").get().n,1000);
  assert.equal(db.prepare("SELECT por_paqueteria AS n FROM pedidos WHERE id='octubre-2026-15'").get().n,1);
  assert.equal(db.prepare("SELECT SUM(fecha_aproximada) AS n FROM pedidos").get().n,1);
  assert.equal(db.prepare("SELECT venta_vendedora AS n FROM pedidos WHERE id='octubre-2026-18'").get().n,1);
  assert.equal(db.prepare("SELECT SUM(cantidad*precio_unitario_centavos) AS n FROM pedido_items WHERE pedido_id='octubre-2026-18'").get().n,9500);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM presentaciones WHERE nombre='35 g' AND precio_centavos=2200").get().n,3);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM pedido_items WHERE producto_id IS NOT NULL OR molienda IS NOT NULL").get().n,0);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM pedido_items WHERE precio_unitario_centavos IS NULL").get().n,1);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM invitaciones").get().n,0);
  db.close();
});
test("repetir la carga no duplica ni sobrescribe registros existentes", () => {
  const db=base(),carga=prepararOctubre(datos,{pago:"pendiente",entrega:"por_preparar"});
  db.exec(carga);
  db.exec("UPDATE pedidos SET referencia='Nota de la clienta' WHERE id='octubre-2026-01'");
  db.exec(carga);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM pedidos").get().n,19);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM auditoria").get().n,19);
  assert.equal(db.prepare("SELECT referencia FROM pedidos WHERE id='octubre-2026-01'").get().referencia,'Nota de la clienta');
  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length,0);
  db.close();
});
test("rechaza importes incoherentes, claves repetidas y estados sin confirmar", () => {
  const incorrectos=structuredClone(datos);incorrectos.ventas[0].totalCentavos++;
  assert.throws(()=>prepararOctubre(incorrectos,{pago:"pagado",entrega:"entregado"}),/No concilia/);
  const repetidos=structuredClone(datos);repetidos.ventas[1].clave=repetidos.ventas[0].clave;
  assert.throws(()=>prepararOctubre(repetidos,{pago:"pagado",entrega:"entregado"}),/repetidas/);
  assert.throws(()=>prepararOctubre(datos,{}));
});
