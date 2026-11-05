import { TEXTOS_INICIO as T } from "../data/inicioAdmin";
import { centavosAPesos, type ResumenInicio } from "../lib/ventasAdmin";

export default function ResumenCostosAdmin({ datos }: { datos: ResumenInicio }) {
  const gastos = datos.gastosMensuales;
  const completo = datos.ventasSinCosto === 0 && datos.ventasLegado === 0 && datos.ventasConCosto > 0;
  const gastosConfirmados = gastos !== null && gastos.length > 0 && gastos.every(g => g.importeCentavos !== null);
  const resultado = completo && gastosConfirmados
    ? datos.gananciaEstimadaCentavos - gastos.reduce((s, g) => s + (g.importeCentavos ?? 0), 0)
    : null;
  return <section className="admin-tarjeta" aria-labelledby="titulo-costos">
    <h2 id="titulo-costos" className="font-titulos text-h4">{T.desgloseCostos}</h2>
    <dl className="mt-3 divide-y divide-stone text-small">
      <div className="flex flex-wrap justify-between gap-2 py-3"><dt>{T.costoVentas}</dt><dd className="cifras">{datos.ventasConCosto > 0 ? centavosAPesos(datos.costoEstimadoCentavos) : "—"}</dd></div>
      <div className="flex flex-wrap justify-between gap-2 py-3"><dt>{T.gananciaVentas}</dt><dd className="cifras">{datos.ventasConCosto > 0 ? centavosAPesos(datos.gananciaEstimadaCentavos) : "—"}</dd></div>
    </dl>
    <p className="text-label tracking-normal text-tinta-suave">{T.costoVentasDetalle} {!completo && T.costosParciales}</p>
    {gastos === null ? <p className="mt-4 text-small text-tinta-suave">{T.gastosPorMes}</p> : <>
      <h3 className="mt-5 font-cuerpo text-small font-semibold">{T.gastosMes}</h3>
      {gastos.length ? <dl className="mt-2 divide-y divide-stone text-small">{gastos.map(g => <div key={`${g.tipo}/${g.concepto}`} className="flex items-start justify-between gap-4 py-3">
        <dt>{g.concepto}<span className="mt-1 block text-label tracking-normal text-tinta-suave">{g.tipo === "equipo" ? T.equipo : T.operativo}</span></dt>
        <dd className="cifras shrink-0">{g.importeCentavos === null ? T.pendienteCosto : centavosAPesos(g.importeCentavos)}</dd>
      </div>)}</dl> : <p className="mt-2 text-small text-tinta-suave">{T.sinGastos}</p>}
      {gastos.length > 0 && <div className="mt-3 border-t border-stone pt-4">
        <p className="text-small">{T.resultadoGastos}</p>
        <p className="cifras mt-1 font-titulos text-h3">{resultado === null ? "—" : centavosAPesos(resultado)}</p>
        <p className="mt-2 text-label tracking-normal text-tinta-suave">{resultado === null ? T.resultadoIncompleto : T.resultadoDetalle}</p>
      </div>}
    </>}
  </section>;
}
