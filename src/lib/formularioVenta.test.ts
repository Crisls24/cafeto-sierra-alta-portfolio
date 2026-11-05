import { describe, expect, it } from "vitest";
import { esquemaCrearVenta, esquemaActualizarVenta } from "../../worker/lib/validar";
import { alternarVentaVendedora, cuerpoVenta, datosInicialesVenta, erroresVenta, hoyVenta, precioACentavos, seleccionarProducto, subtotalLinea } from "./formularioVenta";
import type { ProductoAdmin } from "./ventasAdmin";

const cafe: ProductoAdmin = { id: "cafe", nombre: "Café", categoria: "cafe", activo: true, orden: 1, presentaciones: [{ id: "250g", nombre: "250 g", precioCentavos: 10000, costoCentavos: 6000, activo: true, orden: 1 }] };
const miel: ProductoAdmin = { id: "miel", nombre: "Miel", categoria: "miel", activo: true, orden: 2, presentaciones: [{ id: "litro", nombre: "1 L", precioCentavos: null, costoCentavos: null, activo: true, orden: 1 }] };
const catalogo = [cafe, miel];
const valida = () => ({ ...datosInicialesVenta(), ventaVendedora: true, fecha: "2026-10-23", lineas: [{ clave: 1, productoId: "cafe", presentacionId: "250g", precio: "100.10", cantidad: "3", molienda: "molido" as const }] });

describe("registro de ventas", () => {
  it("impide guardar campos obligatorios vacíos y cantidades inválidas", () => {
    for (const cantidad of ["", " ", "0", "-1", "1.5", "1e2"]) {
      const datos = { ...valida(), lineas: [{ ...valida().lineas[0]!, cantidad }] };
      expect(erroresVenta(datos, catalogo, false)).toHaveProperty("cantidad-1");
      expect(() => cuerpoVenta(datos, catalogo, false)).toThrow();
    }
    expect(erroresVenta({ ...valida(), fecha: "" }, catalogo, false)).toHaveProperty("fecha");
    expect(erroresVenta({ ...valida(), pago: "" as never }, catalogo, false)).toHaveProperty("pago");
    expect(erroresVenta({ ...valida(), entrega: "" as never }, catalogo, false)).toHaveProperty("entrega");
    expect(() => cuerpoVenta(datosInicialesVenta(), catalogo, false)).toThrow();
    expect(() => cuerpoVenta({ ...valida(), lineas: [] }, catalogo, false)).toThrow();
  });
  it("envía la paquetería separada de los productos y la elimina al desactivarla", () => {
    const datos = { ...valida(), ventaVendedora: false, porPaqueteria: true, envio: "50", lineas: [{ ...valida().lineas[0]!, precio: "100", cantidad: "4" }] };
    const body = cuerpoVenta(datos, catalogo, false);
    expect(body).toMatchObject({ porPaqueteria: true, envioCentavos: 5000 });
    expect(body.items[0]?.precioUnitarioCentavos).toBe(10000);
    expect(body.items.reduce((s,i)=>s+i.cantidad*i.precioUnitarioCentavos,0)+body.envioCentavos).toBe(45000);
    expect(esquemaCrearVenta.safeParse(body).success).toBe(true);
    expect(cuerpoVenta({ ...datos, porPaqueteria: false }, catalogo, false)).toMatchObject({ porPaqueteria: false, envioCentavos: 0 });
    expect(cuerpoVenta({ ...datos, envio: "0" }, catalogo, false).envioCentavos).toBe(0);
  });
  it("exige un envío válido y rechaza cargos ocultos o sin declarar paquetería", () => {
    for (const envio of ["", "-1", "1.005", "1e3"]) expect(erroresVenta({ ...valida(), porPaqueteria: true, envio }, catalogo, false)).toHaveProperty("envio");
    const body = cuerpoVenta(valida(), catalogo, false);
    expect(esquemaCrearVenta.safeParse({ ...body, porPaqueteria: false, envioCentavos: 5000 }).success).toBe(false);
    expect(esquemaCrearVenta.safeParse({ ...body, porPaqueteria: true, envioCentavos: undefined }).success).toBe(false);
    expect(esquemaActualizarVenta.safeParse({ envioCentavos: 5000 }).success).toBe(false);
  });
  it("restaura la tarifa al desmarcar vendedora y rechaza precios normales alterados", () => {
    const especial = { ...valida(), lineas: [{ ...valida().lineas[0]!, cantidad: "2", precio: "82" }] };
    const normal = alternarVentaVendedora(especial, false, catalogo);
    expect(normal.lineas[0]).toMatchObject({ precio: "100.00", cantidad: "2", molienda: "molido" });
    expect(cuerpoVenta(normal, catalogo, false).items[0]?.precioUnitarioCentavos).toBe(10000);
    const manipulada = { ...normal, lineas: [{ ...normal.lineas[0]!, precio: "82" }] };
    expect(erroresVenta(manipulada, catalogo, false)).toHaveProperty("precio-1");
    expect(() => cuerpoVenta(manipulada, catalogo, false)).toThrow();
    expect(erroresVenta(alternarVentaVendedora(manipulada, true, catalogo), catalogo, false)).not.toHaveProperty("precio-1");
  });
  it("no convierte una tarifa pendiente en un precio cero para ventas normales", () => {
    const especial = { ...valida(), lineas: [{ ...valida().lineas[0]!, productoId: "miel", presentacionId: "litro", molienda: "" as const, precio: "50" }] };
    const normal = alternarVentaVendedora(especial, false, catalogo);
    expect(normal.lineas[0]?.precio).toBe("");
    expect(erroresVenta(normal, catalogo, false)).toHaveProperty("precio-1");
    expect(cuerpoVenta(especial, catalogo, false).items[0]?.precioUnitarioCentavos).toBe(5000);
  });
  it("conserva canal y tarifa del catálogo al registrar una venta a vendedora", () => {
    const bolsillo = { ...cafe, presentaciones: [...cafe.presentaciones, { id: "35g", nombre: "35 g", precioCentavos: 2200, costoCentavos: null, activo: true, orden: 0 }] };
    const datos = { ...valida(), ventaVendedora: true, canal: "presencial" as const, lineas: [
      { ...valida().lineas[0]!, precio: "82", cantidad: "1" },
      { ...valida().lineas[0]!, clave: 2, presentacionId: "35g", precio: "16", cantidad: "1" },
    ] };
    const body = cuerpoVenta(datos, [bolsillo], false);
    expect(body).toMatchObject({ ventaVendedora: true, canal: "presencial" });
    expect(body.items.reduce((s,l) => s + l.cantidad * l.precioUnitarioCentavos, 0)).toBe(9800);
    expect(bolsillo.presentaciones.map(p => p.precioCentavos)).toEqual([10000, 2200]);
    expect(esquemaCrearVenta.safeParse(body).success).toBe(true);
    expect(esquemaCrearVenta.safeParse({ ...body, ventaVendedora: "sí" }).success).toBe(false);
  });
  it("usa el día de Ciudad de México, una línea vacía y el canal por defecto de la API", () => {
    expect(hoyVenta(new Date("2026-10-30T03:00:00Z"))).toBe("2026-10-29");
    const datos = datosInicialesVenta();
    expect(datos.canal).toBe("otro");
    expect(datos.fechaEntrega).toBe("");
    expect(datos).not.toHaveProperty("fechaPago");
    expect(datos.lineas[0]?.productoId).toBe("");
  });
  it("trabaja en centavos sin truncar cantidades ni redondear precios inválidos", () => {
    expect(precioACentavos("100,10")).toBe(10010);
    expect(precioACentavos("$ 0.29")).toBe(29);
    for (const valor of ["", "-1", "1.005", "1e4", "NaN", "1,000.00", "1000000.01"]) expect(precioACentavos(valor)).toBeNull();
    expect(subtotalLinea(valida().lineas[0]!)).toBe(30030);
    expect(erroresVenta({ ...valida(), lineas: [{ ...valida().lineas[0]!, cantidad: "1.5" }] }, catalogo, false)).toHaveProperty("cantidad-1");
  });
  it("limpia formato, precio y molienda incompatibles al cambiar de producto", () => {
    const linea = seleccionarProducto(valida().lineas[0]!, miel);
    expect(linea).toMatchObject({ productoId: "miel", presentacionId: "", precio: "", molienda: "" });
    expect(seleccionarProducto(linea, cafe)).toMatchObject({ presentacionId: "", precio: "", molienda: "grano-entero" });
  });
  it("omite fechas de estados pendientes en creación y cumple el contrato real", () => {
    const body = cuerpoVenta(valida(), catalogo, false);
    expect(body).not.toHaveProperty("pagadoEn");
    expect(body).not.toHaveProperty("entregadoEn");
    expect(esquemaCrearVenta.safeParse(body).success).toBe(true);
    expect(body.items[0]?.precioUnitarioCentavos).toBe(10010);
    expect(esquemaActualizarVenta.safeParse(cuerpoVenta(valida(), catalogo, true)).success).toBe(true);
  });
  it("mantiene pago y entrega independientes sin pedir fecha de pago", () => {
    const entregada = { ...valida(), entrega: "entregado" as const, fechaEntrega: "" };
    expect(erroresVenta(entregada, catalogo, false)).toHaveProperty("fechaEntrega");
    const body = cuerpoVenta({ ...entregada, fechaEntrega: "2026-10-24" }, catalogo, false);
    expect(body).toMatchObject({ estadoEntrega: "entregado", estadoPago: "pendiente", entregadoEn: "2026-10-24" });
    expect(body).not.toHaveProperty("pagadoEn");
    const pagada = cuerpoVenta({ ...valida(), pago: "pagado" }, catalogo, false);
    expect(pagada).toMatchObject({ estadoEntrega: "por_preparar", estadoPago: "pagado" });
    expect(pagada).not.toHaveProperty("pagadoEn");
    expect(esquemaCrearVenta.safeParse(pagada).success).toBe(true);
    expect(esquemaActualizarVenta.safeParse(cuerpoVenta({ ...valida(), pago: "pagado" }, catalogo, true)).success).toBe(true);
  });
  it("suma varias líneas con precios especiales y omite molienda en productos sin ella", () => {
    const datos = { ...valida(), lineas: [...valida().lineas, { clave: 2, productoId: "miel", presentacionId: "litro", precio: "0.29", cantidad: "7", molienda: "molido" as const }] };
    const body = cuerpoVenta(datos, catalogo, false);
    expect(body.items[1]).not.toHaveProperty("molienda");
    expect(datos.lineas.reduce((s, l) => s + subtotalLinea(l)!, 0)).toBe(body.items.reduce((s, l) => s + l.cantidad * l.precioUnitarioCentavos, 0));
    expect(esquemaCrearVenta.safeParse(body).success).toBe(true);
  });
  it("rechaza fecha inexistente, producto ajeno, línea vacía y precios ausentes", () => {
    const datos = { ...valida(), fecha: "2026-02-30", lineas: [{ ...valida().lineas[0]!, presentacionId: "litro", precio: "" }] };
    expect(erroresVenta(datos, catalogo, false)).toMatchObject({ fecha: expect.any(String), "formato-1": expect.any(String), "precio-1": expect.any(String) });
    expect(() => cuerpoVenta(datos, catalogo, false)).toThrow();
    expect(erroresVenta({ ...datos, lineas: [] }, catalogo, false)).toHaveProperty("lineas");
  });
});
