import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { normalizarExport } from "./normalizar-export.mjs";

function fixture() {
  const padre = path.resolve(".wrangler/export-tests");
  fs.mkdirSync(padre, { recursive: true });
  return fs.mkdtempSync(path.join(padre, "caso-"));
}
test("normaliza segmentos anidados de Windows y no modifica sus contenidos", () => {
  const raiz = fixture();
  const carpeta = path.join(raiz,"admin","ventas","__next.admin","ventas");
  fs.mkdirSync(carpeta,{recursive:true});
  fs.writeFileSync(path.join(carpeta,"__PAGE__.txt"),"segmento RSC de prueba");
  assert.equal(normalizarExport(raiz),1);
  assert.equal(fs.readFileSync(path.join(raiz,"admin","ventas","__next.admin.ventas.__PAGE__.txt"),"utf8"),"segmento RSC de prueba");
  assert.equal(normalizarExport(raiz),0);
  assert.equal(fs.existsSync(path.join(carpeta,"__PAGE__.txt")),true);
});
test("conserva el export normal y no copia archivos ajenos a RSC", () => {
  const raiz=fixture();
  fs.mkdirSync(path.join(raiz,"admin","__next.admin"),{recursive:true});
  fs.writeFileSync(path.join(raiz,"admin","index.html"),"HTML");
  fs.writeFileSync(path.join(raiz,"admin","__next._full.txt"),"RSC plano");
  fs.writeFileSync(path.join(raiz,"admin","__next.admin","archivo.js"),"JS");
  assert.equal(normalizarExport(raiz),0);
  assert.equal(fs.readFileSync(path.join(raiz,"admin","__next._full.txt"),"utf8"),"RSC plano");
});
