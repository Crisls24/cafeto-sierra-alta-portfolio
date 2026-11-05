import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { rutasAdmin } from "../rutas/admin";

import {
  actualizarVenta,
  cancelarVenta,
  cambiarEstadoEntrega,
  crearVenta,
  entregarVenta,
  listarProductos,
  listarVentas,
  listarVentasPaginadas,
  obtenerVenta,
  registrarPago,
  resumenInicio,
} from "../lib/ventas";

async function limpiar(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM resenas"),
    env.DB.prepare("DELETE FROM invitaciones"),
    env.DB.prepare("DELETE FROM pedido_items"),
    env.DB.prepare("DELETE FROM pedidos"),
    env.DB.prepare("DELETE FROM auditoria"),
    env.DB.prepare("DELETE FROM gastos_mensuales"),
  ]);
}

beforeEach(limpiar);

describe("ventas", () => {
  it("la API rechaza vacíos en precios y cantidades y admite Pagado sin fecha manual", async () => {
    const url = new URL("https://cafeto.test/api/admin/ventas");
    const item = { productoId: "cafe-lavado", presentacionId: "cafe-lavado-250g", cantidad: 1, precioUnitarioCentavos: 10000 };
    const datos = { vendidoEn: "2026-10-30", ventaVendedora: true, estadoPago: "pagado", items: [item] };
    const enviar = (body: unknown) => rutasAdmin(new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), { ...env, ACCESS_DEV_BYPASS: "1" }, url);
    for (const precioUnitarioCentavos of ["", " ", null, false, [], undefined]) {
      expect((await enviar({ ...datos, items: [{ ...item, precioUnitarioCentavos }] }))?.status).toBe(400);
    }
    for (const cantidad of ["", " ", 0, -1, 1.5, null, true, "1e2"]) {
      expect((await enviar({ ...datos, items: [{ ...item, cantidad }] }))?.status).toBe(400);
    }
    expect((await enviar({ ...datos, items: [] }))?.status).toBe(400);
    expect((await listarVentas(env)).length).toBe(0);
    const respuesta = await enviar(datos);
    expect(respuesta?.status).toBe(201);
    const creada = await respuesta!.json() as { id: string };
    expect((await obtenerVenta(env, creada.id))?.estadoPago).toBe("pagado");
  });
  it("suma el envío una vez y permite cambiarlo o retirarlo sin tocar los productos", async () => {
    const creada = await crearVenta(env, { porPaqueteria: true, envioCentavos: 5000, vendidoEn: "2026-10-22", canal: "facebook", estadoEntrega: "por_preparar", estadoPago: "pendiente", actor: "admin@test", items: [{ productoId: "cafe-lavado", presentacionId: "cafe-lavado-250g", cantidad: 4, precioUnitarioCentavos: 10000 }] });
    if (!creada.ok) throw new Error("Venta no creada");
    expect(await obtenerVenta(env, creada.id)).toMatchObject({ porPaqueteria: true, envioCentavos: 5000, totalCentavos: 45000, costosCompletos: false });
    const resumen = await resumenInicio(env, "2026-10-22", "2026-10-22");
    expect(resumen.ventasCentavos).toBe(45000);
    expect(resumen.ventasPorDia).toEqual([{ fecha: "2026-10-22", totalCentavos: 45000 }]);
    expect(await actualizarVenta(env, { id: creada.id, actor: "admin@test", porPaqueteria: true, envioCentavos: 7000 })).toMatchObject({ ok: true });
    expect((await obtenerVenta(env, creada.id))?.totalCentavos).toBe(47000);
    expect(await actualizarVenta(env, { id: creada.id, actor: "admin@test", porPaqueteria: false, envioCentavos: 0 })).toMatchObject({ ok: true });
    const sinEnvio = await obtenerVenta(env, creada.id);
    expect(sinEnvio).toMatchObject({ porPaqueteria: false, envioCentavos: 0, totalCentavos: 40000 });
    expect(sinEnvio?.items[0]).toMatchObject({ precioUnitarioCentavos: 10000, cantidad: 4 });
    await actualizarVenta(env, { id: creada.id, actor: "admin@test", porPaqueteria: true, envioCentavos: 0 });
    expect(await obtenerVenta(env, creada.id)).toMatchObject({ porPaqueteria: true, envioCentavos: 0, totalCentavos: 40000 });
  });
  it("guarda y permite corregir la marca de vendedora sin cambiar el catálogo", async () => {
    await env.DB.prepare("INSERT INTO presentaciones (id,producto_id,nombre,precio_centavos) VALUES ('prueba-35g','cafe-lavado','35 g',2200)").run();
    const creada = await crearVenta(env, { ventaVendedora: true, vendidoEn: "2026-10-30", canal: "presencial", estadoEntrega: "por_preparar", estadoPago: "pendiente", actor: "admin@test", items: [{ productoId: "cafe-lavado", presentacionId: "prueba-35g", cantidad: 1, precioUnitarioCentavos: 1600 }] });
    if (!creada.ok) throw new Error("No se creó la venta");
    expect(await obtenerVenta(env, creada.id)).toMatchObject({ ventaVendedora: true, canal: "presencial", totalCentavos: 1600 });
    expect((await listarProductos(env)).find(p=>p.id === "cafe-lavado")?.presentaciones.find(p=>p.id === "prueba-35g")?.precioCentavos).toBe(2200);
    expect(await actualizarVenta(env, { id: creada.id, actor: "admin@test", ventaVendedora: false })).toMatchObject({ ok: false, motivo: "precio_catalogo" });
    expect(await actualizarVenta(env, { id: creada.id, actor: "admin@test", ventaVendedora: false, items: [{ productoId: "cafe-lavado", presentacionId: "prueba-35g", cantidad: 1, precioUnitarioCentavos: 2200 }] })).toMatchObject({ ok: true });
    expect((await obtenerVenta(env, creada.id))?.ventaVendedora).toBe(false);
    expect((await obtenerVenta(env, creada.id))?.totalCentavos).toBe(2200);
    await env.DB.prepare("DELETE FROM pedido_items WHERE pedido_id = ?").bind(creada.id).run();
    await env.DB.prepare("DELETE FROM presentaciones WHERE id = 'prueba-35g'").run();
  });
  it("la API exige catálogo y tarifa normal aunque se altere el cuerpo del formulario", async () => {
    const url = new URL("https://cafeto.test/api/admin/ventas");
    const venta = { vendidoEn: "2026-10-30", canal: "presencial", items: [{ productoId: "cafe-lavado", presentacionId: "cafe-lavado-250g", cantidad: 1, precioUnitarioCentavos: 8200 }] };
    const enviar = (body: unknown) => rutasAdmin(new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), { ...env, ACCESS_DEV_BYPASS: "1" }, url);
    const normal = await enviar(venta);
    expect(normal?.status).toBe(409);
    expect((await listarVentas(env)).length).toBe(0);
    expect((await enviar({ ...venta, ventaVendedora: true }))?.status).toBe(201);
    expect((await enviar({ ...venta, items: [{ nombreProducto: "Café", nombrePresentacion: "250 g", cantidad: 1, precioUnitarioCentavos: 1 }] }))?.status).toBe(400);
  });
  it("conserva precios históricos normales y rechaza nuevas tarifas manipuladas", async () => {
    const item = { productoId: "cafe-lavado", presentacionId: "cafe-lavado-250g", cantidad: 1, precioUnitarioCentavos: 10000 };
    const datos = { vendidoEn: "2026-10-01", canal: "presencial" as const, estadoEntrega: "por_preparar" as const, estadoPago: "pendiente" as const, items: [item], actor: "admin@test" };
    const creada = await crearVenta(env, datos);
    if (!creada.ok) throw new Error("Venta no creada");
    await env.DB.prepare("UPDATE presentaciones SET precio_centavos=11000 WHERE id='cafe-lavado-250g'").run();
    try {
      expect(await crearVenta(env, datos)).toMatchObject({ ok: false, motivo: "precio_catalogo" });
      expect(await actualizarVenta(env, { id: creada.id, actor: datos.actor, items: [{ ...item, cantidad: 2 }] })).toMatchObject({ ok: true });
      expect((await obtenerVenta(env, creada.id))?.totalCentavos).toBe(20000);
      expect(await actualizarVenta(env, { id: creada.id, actor: datos.actor, items: [{ ...item, precioUnitarioCentavos: 1 }] })).toMatchObject({ ok: false, motivo: "precio_catalogo" });
      expect(await crearVenta(env, { ...datos, items: [{ productoId: "miel-multiflora", presentacionId: "miel-multiflora-litro", cantidad: 1, precioUnitarioCentavos: 0 }] })).toMatchObject({ ok: false, motivo: "precio_pendiente" });
    } finally {
      await env.DB.prepare("UPDATE presentaciones SET precio_centavos=10000 WHERE id='cafe-lavado-250g'").run();
    }
  });
  it("conserva el total histórico y suma cada venta una vez en la gráfica", async () => {
    await env.DB.prepare("INSERT INTO pedidos(id,folio,canal,vendido_en,total_reportado_centavos,envio_centavos,fecha_aproximada,por_paqueteria) VALUES ('hist-importada',1,'otro','2026-10-22',95000,5000,1,1)").run();
    for (const [indice, cantidad] of [4,1,1].entries()) await env.DB.prepare("INSERT INTO pedido_items(id,pedido_id,nombre_producto,nombre_presentacion,cantidad,precio_unitario_centavos) VALUES (?,'hist-importada','Café sin identificar','Formato',?,NULL)").bind(`hist-${indice}`,cantidad).run();
    const venta = await obtenerVenta(env, "hist-importada");
    expect(venta).toMatchObject({ totalCentavos: 95000, porPaqueteria: true, envioCentavos: 5000, fechaAproximada: true, costosCompletos: false });
    expect(venta?.items.every(i=>i.precioUnitarioCentavos === null && i.subtotalCentavos === null)).toBe(true);
    const resumen = await resumenInicio(env, "2026-10-22", "2026-10-22");
    expect(resumen.ventasCentavos).toBe(95000);
    expect(resumen.ventasPorDia).toEqual([{ fecha: "2026-10-22", totalCentavos: 95000 }]);
    expect(resumen.gananciaEstimadaCentavos).toBe(0);
    expect(await actualizarVenta(env, { id: "hist-importada", actor: "admin@test", items: [{ nombreProducto: "Café", nombrePresentacion: "250 g", cantidad: 1, precioUnitarioCentavos: 1 }] })).toMatchObject({ ok: false, motivo: "no_editable" });
  });
  it("pagina más de 200 ventas y cuenta toda la búsqueda sin depender de la página", async () => {
    await env.DB.batch(Array.from({ length: 205 }, (_, i) => env.DB.prepare(
      `INSERT INTO pedidos (id, folio, canal, referencia, vendido_en, estado_entrega, estado_pago)
       VALUES (?, ?, ?, 'Prueba de paginación', '2026-10-23', ?, ?)`
    ).bind(`paginada-${i}`, i + 1, i === 204 ? "presencial" : "whatsapp", i === 0 ? "cancelado" : i === 1 ? "entregado" : "listo", i === 1 ? "pagado" : "pendiente")));
    const pagina = await listarVentasPaginadas(env, { pagina: 2, limite: 20, canal: "whatsapp", q: "paginación" });
    expect(pagina.ventas).toHaveLength(20);
    expect(pagina.total).toBe(204);
    expect(pagina.paginas).toBe(11);
    expect(pagina.conteos).toEqual({ todas: 204, porCobrar: 202, porEntregar: 202 });
    const pendientes = await listarVentasPaginadas(env, { entrega: "por_entregar", canal: "whatsapp", pagina: 11 });
    expect(pendientes.total).toBe(202);
    expect(pendientes.ventas).toHaveLength(2);
    expect(pendientes.conteos.todas).toBe(204);
    const cobros = await listarVentasPaginadas(env, { pago: "pendiente", excluirCanceladas: true, canal: "whatsapp" });
    expect(cobros.total).toBe(202);
    const vacia = await listarVentasPaginadas(env, { q: "no hay coincidencias", pagina: 999 });
    expect(vacia).toMatchObject({ ventas: [], total: 0, pagina: 1, paginas: 1, conteos: { todas: 0 } });
  });
  it("el resumen vacío incluye días sin inventar ventas ni fechas futuras", async () => {
    const resumen = await resumenInicio(env, "2026-10-01", "2026-10-03");
    expect(resumen.ventasPorDia).toEqual([
      { fecha: "2026-10-01", totalCentavos: 0 },
      { fecha: "2026-10-02", totalCentavos: 0 },
      { fecha: "2026-10-03", totalCentavos: 0 },
    ]);
    expect(resumen.cantidadVentas).toBe(0);
    expect(resumen.cobrosPendientes).toBe(0);
    expect(resumen.porEntregar).toBe(0);
    expect(resumen.entregados).toBe(0);
    const futuro = await resumenInicio(env, "2099-01-01", "2099-01-31");
    expect(futuro.ventasPorDia).toEqual([]);
  });

  it("serie y pendientes abarcan más de cinco ventas y excluyen canceladas", async () => {
    for (let i = 0; i < 8; i++) {
      const creada = await crearVenta(env, {
        vendidoEn: i === 7 ? "2026-09-30" : i < 3 ? "2026-10-01" : "2026-10-03",
        canal: "whatsapp", estadoEntrega: i === 0 ? "entregado" : "por_preparar",
        estadoPago: i === 0 ? "pagado" : "pendiente",
        items: [{ nombreProducto: "Café de nombre muy largo para verificar el resumen", nombrePresentacion: "250 g", cantidad: 1, precioUnitarioCentavos: 10000, costoUnitarioCentavos: 6000 }],
        actor: "admin@test",
      });
      if (!creada.ok) throw new Error("No se creó la venta");
      if (i === 6) await cancelarVenta(env, { id: creada.id, actor: "admin@test" });
    }
    const resumen = await resumenInicio(env, "2026-10-01", "2026-10-03");
    expect(resumen.recientes).toHaveLength(5);
    expect(resumen.cantidadVentas).toBe(6);
    expect(resumen.ventasCentavos).toBe(60000);
    expect(resumen.ventasPorDia).toEqual([
      { fecha: "2026-10-01", totalCentavos: 30000 },
      { fecha: "2026-10-02", totalCentavos: 0 },
      { fecha: "2026-10-03", totalCentavos: 30000 },
    ]);
    expect(resumen.ventasPorDia.reduce((s, p) => s + p.totalCentavos, 0)).toBe(resumen.ventasCentavos);
    expect(resumen.cobrosPendientes).toBe(5);
    expect(resumen.porEntregar).toBe(5);
    expect(resumen.entregados).toBe(1);
  });
  it("crea una venta con items del catálogo", async () => {
    const resultado = await crearVenta(env, {
      vendidoEn: "2026-10-01",
      canal: "whatsapp",
      referencia: "Pedido A",
      estadoEntrega: "por_preparar",
      estadoPago: "pendiente",
      items: [
        {
          productoId: "cafe-lavado",
          presentacionId: "cafe-lavado-250g",
          cantidad: 2,
          precioUnitarioCentavos: 10000,
        },
      ],
      actor: "admin@test",
    });

    expect(resultado).toEqual({ ok: true, id: expect.any(String) });
    if (!resultado.ok) return;
    const ventas = await listarVentas(env, {});
    expect(ventas).toHaveLength(1);
    expect(ventas[0]?.folio).toBe(1);
    expect(ventas[0]?.totalCentavos).toBe(20000);
    expect(ventas[0]?.itemsResumen).toContain("Café de altura lavado");
    expect(ventas[0]?.legado).toBe(false);
  });

  it("no permite moler productos que no son café", async () => {
    const resultado = await crearVenta(env, {
      vendidoEn: "2026-10-01",
      canal: "whatsapp",
      estadoEntrega: "por_preparar",
      estadoPago: "pendiente",
      items: [
        {
          productoId: "miel-multiflora",
          presentacionId: "miel-multiflora-litro",
          molienda: "molido",
          cantidad: 1,
          precioUnitarioCentavos: 0,
        },
      ],
      actor: "admin@test",
    });
    expect(resultado).toEqual({ ok: false, motivo: "molienda_no_aplica" });
  });

  it("entrega con estado_entrega y audita", async () => {
    const creado = await crearVenta(env, {
      vendidoEn: "2026-10-01",
      canal: "presencial",
      estadoEntrega: "por_preparar",
      estadoPago: "pendiente",
      items: [
        {
          nombreProducto: "Queso",
          nombrePresentacion: "Pie",
          cantidad: 1,
          precioUnitarioCentavos: 5000,
          costoUnitarioCentavos: 3000,
        },
      ],
      actor: "admin@test",
    });
    if (!creado.ok) throw new Error("No se creó la venta");
    const entregado = await entregarVenta(env, {
      id: creado.id,
      actor: "admin@test",
      entregadoEn: "2026-10-02",
    });
    expect(entregado).toEqual({ ok: true, id: creado.id });
    const venta = await listarVentas(env, {});
    expect(venta[0]?.estadoEntrega).toBe("entregado");
    expect(venta[0]?.entregadoEn).toBeTruthy();
  });

  it("cambia estado entre por_preparar y listo", async () => {
    const creado = await crearVenta(env, {
      vendidoEn: "2026-10-01",
      canal: "otro",
      estadoEntrega: "por_preparar",
      estadoPago: "pendiente",
      items: [
        {
          nombreProducto: "Miel",
          nombrePresentacion: "Litro",
          cantidad: 1,
          precioUnitarioCentavos: 2500,
        },
      ],
      actor: "admin@test",
    });
    if (!creado.ok) throw new Error("No se creó la venta");
    const resultado = await cambiarEstadoEntrega(env, {
      id: creado.id,
      estado: "listo",
      actor: "admin@test",
    });
    expect(resultado).toEqual({ ok: true, id: creado.id });
    const venta = await listarVentas(env, {});
    expect(venta[0]?.estadoEntrega).toBe("listo");
  });

  it("registra pago y calcula por cobrar", async () => {
    const creado = await crearVenta(env, {
      vendidoEn: "2026-10-01",
      canal: "correo",
      estadoEntrega: "listo",
      estadoPago: "pendiente",
      items: [
        {
          nombreProducto: "Café",
          nombrePresentacion: "500 g",
          cantidad: 1,
          precioUnitarioCentavos: 19000,
        },
      ],
      actor: "admin@test",
    });
    if (!creado.ok) throw new Error("No se creó la venta");
    await registrarPago(env, {
      id: creado.id,
      estado: "pagado",
      actor: "admin@test",
      pagadoEn: "2026-10-03",
    });
    const resumen = await resumenInicio(env, "2026-10-01", "2026-10-31");
    expect(resumen.cobradoCentavos).toBe(19000);
    expect(resumen.porCobrarCentavos).toBe(0);
  });

  it("cancela y revoca invitación activa", async () => {
    const creado = await crearVenta(env, {
      vendidoEn: "2026-10-01",
      canal: "instagram",
      estadoEntrega: "entregado",
      entregadoEn: "2026-10-01",
      estadoPago: "pagado",
      items: [
        {
          nombreProducto: "Café",
          nombrePresentacion: "1 kg",
          cantidad: 1,
          precioUnitarioCentavos: 36000,
        },
      ],
      actor: "admin@test",
    });
    if (!creado.ok) throw new Error("No se creó la venta");
    const tokenHash = "hash-prueba";
    await env.DB.prepare(
      `INSERT INTO invitaciones (id, pedido_id, token_hash, expira_en, creada_en)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(crypto.randomUUID(), creado.id, tokenHash, "2999-01-01T00:00:00.000Z", new Date().toISOString())
      .run();
    const cancelado = await cancelarVenta(env, { id: creado.id, actor: "admin@test" });
    expect(cancelado).toEqual({ ok: true, id: creado.id });
    const fila = await env.DB.prepare(
      "SELECT revocada_en FROM invitaciones WHERE pedido_id = ?"
    )
      .bind(creado.id)
      .first<{ revocada_en: string | null }>();
    expect(fila?.revocada_en).toBeTruthy();
  });

  it("edita solo si no está entregado o cancelado", async () => {
    const creado = await crearVenta(env, {
      vendidoEn: "2026-10-01",
      canal: "otro",
      estadoEntrega: "por_preparar",
      estadoPago: "pendiente",
      items: [
        {
          nombreProducto: "Café",
          nombrePresentacion: "250 g",
          cantidad: 1,
          precioUnitarioCentavos: 10000,
        },
      ],
      actor: "admin@test",
    });
    if (!creado.ok) throw new Error("No se creó la venta");
    await entregarVenta(env, { id: creado.id, actor: "admin@test" });
    const editado = await actualizarVenta(env, {
      id: creado.id,
      referencia: "No",
      actor: "admin@test",
    });
    expect(editado).toEqual({ ok: false, motivo: "no_editable" });
  });

  it("ganancia estimada usa solo ventas con costo completo", async () => {
    await crearVenta(env, {
      vendidoEn: "2026-10-05",
      canal: "whatsapp",
      estadoEntrega: "entregado",
      entregadoEn: "2026-10-05",
      estadoPago: "pagado",
      items: [
        {
          nombreProducto: "Con costo",
          nombrePresentacion: "1",
          cantidad: 2,
          precioUnitarioCentavos: 10000,
          costoUnitarioCentavos: 4000,
        },
      ],
      actor: "admin@test",
    });
    await crearVenta(env, {
      vendidoEn: "2026-10-05",
      canal: "whatsapp",
      estadoEntrega: "entregado",
      entregadoEn: "2026-10-05",
      estadoPago: "pagado",
      items: [
        {
          nombreProducto: "Sin costo",
          nombrePresentacion: "1",
          cantidad: 1,
          precioUnitarioCentavos: 5000,
        },
      ],
      actor: "admin@test",
    });
    const resumen = await resumenInicio(env, "2026-10-01", "2026-10-31");
    expect(resumen.ventasConCosto).toBe(1);
    expect(resumen.ventasSinCosto).toBe(1);
    expect(resumen.gananciaEstimadaCentavos).toBe(20000 - 8000);
  });

  it("calcula ganancia histórica con total confirmado y costo real de paquetería", async () => {
    await env.DB.prepare("INSERT INTO pedidos(id,folio,vendido_en,total_reportado_centavos,envio_centavos,por_paqueteria) VALUES ('con-costos',1,'2026-10-22',95000,5000,1)").run();
    await env.DB.prepare("INSERT INTO pedido_items(id,pedido_id,nombre_producto,nombre_presentacion,cantidad,precio_unitario_centavos,costo_unitario_centavos) VALUES ('costo-hist','con-costos','Café','250 g',4,NULL,6000)").run();
    expect((await resumenInicio(env,"2026-10-01","2026-10-31")).ventasSinCosto).toBe(1);
    await env.DB.prepare("UPDATE pedidos SET costo_envio_centavos=5000 WHERE id='con-costos'").run();
    expect(await obtenerVenta(env,"con-costos")).toMatchObject({costosCompletos:true,costoEstimadoCentavos:29000});
    expect(await resumenInicio(env,"2026-10-01","2026-10-31")).toMatchObject({ventasConCosto:1,ventasSinCosto:0,gananciaEstimadaCentavos:66000});
  });

  it("los gastos con fecha solo mensual no se asignan a una semana", async () => {
    await env.DB.prepare("INSERT INTO gastos_mensuales(id,periodo,concepto,tipo,importe_centavos,fuente) VALUES ('molino','2026-10','Molino','equipo',77000,'propietario')").run();
    expect((await resumenInicio(env,"2026-10-01","2026-10-31")).gastosMensuales).toEqual([{concepto:"Molino",tipo:"equipo",importeCentavos:77000}]);
    expect((await resumenInicio(env,"2026-10-01","2026-10-07")).gastosMensuales).toBeNull();
    expect((await resumenInicio(env,"2026-11-01","2026-11-30")).gastosMensuales).toEqual([]);
  });

  it("editar una venta conserva el costo histórico aunque cambie el catálogo", async () => {
    try {
      await env.DB.prepare("UPDATE presentaciones SET costo_centavos=5000 WHERE id='cafe-lavado-250g'").run();
      const item={productoId:"cafe-lavado",presentacionId:"cafe-lavado-250g",cantidad:1,precioUnitarioCentavos:10000};
      const venta=await crearVenta(env,{canal:"presencial",vendidoEn:"2026-10-05",estadoEntrega:"por_preparar",estadoPago:"pendiente",items:[item],actor:"admin@test"});
      if(!venta.ok) throw new Error("No se creó la venta");
      await env.DB.prepare("UPDATE presentaciones SET costo_centavos=6000 WHERE id='cafe-lavado-250g'").run();
      expect(await actualizarVenta(env,{id:venta.id,items:[{...item,cantidad:2}],actor:"admin@test"})).toMatchObject({ok:true});
      expect((await obtenerVenta(env,venta.id))?.items[0]).toMatchObject({costoUnitarioCentavos:5000,cantidad:2});
    } finally { await env.DB.prepare("UPDATE presentaciones SET costo_centavos=NULL WHERE id='cafe-lavado-250g'").run(); }
  });

  it("lista productos con presentaciones", async () => {
    const productos = await listarProductos(env);
    expect(productos.length).toBeGreaterThan(0);
    const cafe = productos.find((p) => p.id === "cafe-lavado");
    expect(cafe?.presentaciones.length).toBe(3);
  });
});
