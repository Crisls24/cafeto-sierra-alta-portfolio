import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { prepararOctubre, prepararCatalogo } from "./preparar-ventas-octubre.mjs";
import { prepararCostosCafe } from "./preparar-costos-cafe.mjs";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const leer = p => JSON.parse(readFileSync(resolve(raiz,p), "utf8"));
const config = leer("wrangler.jsonc");
if (config.name !== "cafeto-sierra-alta-portfolio" || config.d1_databases[0].database_id !== "00000000-0000-0000-0000-000000000000") {
  throw new Error("La preparación automática solo funciona con la base ficticia de portafolio.");
}
if (!existsSync(resolve(raiz,".dev.vars"))) writeFileSync(resolve(raiz,".dev.vars"), "# Solo demostración local. Nunca configurar este bypass en producción.\nACCESS_DEV_BYPASS=1\n");
process.env.WRANGLER_LOG_PATH = resolve(raiz,".wrangler/logs");
const ejecutar = args => {
  const r=spawnSync(process.execPath,[resolve(raiz,"node_modules/wrangler/bin/wrangler.js"),...args],{cwd:raiz,env:process.env,stdio:"inherit"});
  if(r.status!==0) throw new Error("Wrangler no pudo preparar la base local.");
};
ejecutar(["d1","migrations","apply","DB","--local","--persist-to",".wrangler/demo-state"]);
const ventas = leer("examples/ventas-octubre.demo.json");
const costos = prepararCostosCafe(leer("examples/costos-cafe.demo.json"),ventas);
const dia = new Intl.DateTimeFormat("en-CA",{timeZone:"America/Mexico_City",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const anterior = new Date(`${dia}T12:00:00Z`); anterior.setUTCDate(0);
const periodo = anterior.toISOString().slice(0,7);
const prefijo = `demo-${periodo}`;
let sql = [prepararCatalogo(leer("src/data/presentacionesAdmin.json")),prepararOctubre(ventas,{pago:"pagado",entrega:"entregado"}),costos.catalogoSql,costos.octubreSql].join("\n");
sql=sql.replaceAll("octubre-2026",prefijo).replaceAll("2026-10",periodo);
for (const nombre of ["selladora","molino","uniformes","franela"]) sql=sql.replaceAll(`demo-${nombre}`,`demo-${periodo}-${nombre}`);
const escapar = v => `'${String(v).replaceAll("'","''")}'`;
const hash = v => createHash("sha256").update(v).digest("hex");
const token = createHash("sha256").update(`cafeto-portafolio-invitacion-ficticia-${periodo}`).digest("base64url");
sql += `\nINSERT INTO invitaciones(id,pedido_id,token_hash,expira_en) VALUES (${escapar('demo-invitacion-activa-'+periodo)},${escapar(prefijo+'-04')},${escapar(hash(token))},'2099-12-31T23:59:59.000Z') ON CONFLICT DO NOTHING;\n`;
for(const [indice,estado] of ["aprobada","pendiente","rechazada"].entries()) {
  const id=`demo-${periodo}-opinion-${indice}`; const pedido=`${prefijo}-${String(indice+1).padStart(2,"0")}`;
  sql+=`INSERT INTO invitaciones(id,pedido_id,token_hash,expira_en,usada_en) VALUES (${escapar(id)},${escapar(pedido)},${escapar(hash(id))},'2099-12-31T23:59:59.000Z',${escapar(periodo+'-20T12:00:00.000Z')}) ON CONFLICT DO NOTHING;\n`;
  sql+=`INSERT INTO resenas(id,pedido_id,invitacion_id,calificacion,comentario,nombre_publico,estado,identificacion,consentimiento_version,consentimiento_en) VALUES (${escapar(id)},${escapar(pedido)},${escapar(id)},${[5,4,2][indice]},'Opinión ficticia para explorar la demostración. No corresponde a un cliente real.',${escapar('Cliente de ejemplo '+(indice+1))},${escapar(estado)},'invitado','demo',${escapar(periodo+'-20T12:00:00.000Z')}) ON CONFLICT DO NOTHING;\n`;
}
const carpeta=resolve(raiz,".wrangler/demo"); mkdirSync(carpeta,{recursive:true});
writeFileSync(resolve(carpeta,"datos.sql"),sql);
ejecutar(["d1","execute","DB","--local","--persist-to",".wrangler/demo-state","--file",resolve(carpeta,"datos.sql")]);
console.log(`\nDemo lista: http://localhost:8788/admin/\nPeriodo: ${periodo} (Mes anterior)\nFormulario: http://localhost:8788/resena/${token}\nTodos los datos son ficticios. La preparación no accede a una base remota.\n`);
