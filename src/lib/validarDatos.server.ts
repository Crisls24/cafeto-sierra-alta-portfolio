import "server-only";

import fs from "node:fs";
import path from "node:path";

import { COMPROMISO } from "../data/compromiso";
import { PRODUCTOS } from "../data/productos";
import { SITUACIONES } from "../data/soluciones";
import { PENDIENTE } from "../data/tipos";

/**
 * Validaciones que necesitan el disco, y por eso no pueden vivir en `data/`.
 *
 * `src/data/productos.ts` lo importan `Catalogo` y `TarjetaProducto`, que son
 * componentes cliente. Cualquier módulo que lean también se compila para el
 * navegador, y ahí `node:fs` no existe. Este archivo es el único del proyecto
 * que lee `public/`, y la directiva `server-only` hace que importarlo desde un
 * componente cliente sea un error de compilación en lugar de un pantalla en
 * blanco en producción.
 *
 * Estas comprobaciones son de desarrollo y build. No se ejecutan en el
 * navegador: si una foto falta, el sitio lo detecta antes de publicar.
 */

/**
 * Comprueba que la foto de un producto exista realmente en `public/`.
 */
function existeFoto(foto: string): boolean {
  return fs.existsSync(path.join(process.cwd(), "public", foto));
}

/**
 * Valida los archivos referenciados por el catálogo.
 *
 * Devuelve la lista de problemas en lugar de lanzar, para que el mensaje de
 * error diga qué foto falta y cuál producto la pidió. El caller decide si eso
 * detiene el build o solo avisa.
 */
export function validarFotosCatalogo(): string[] {
  const errores: string[] = [];

  for (const producto of PRODUCTOS) {
    if (producto.foto !== PENDIENTE && !existeFoto(producto.foto)) {
      errores.push(
        `La foto '${producto.foto}' del producto '${producto.id}' no existe en public/.`
      );
    }

    if (producto.fotoGrano && !existeFoto(producto.fotoGrano)) {
      errores.push(
        `La foto del grano '${producto.fotoGrano}' del producto '${producto.id}' no existe en public/.`
      );
    }

    for (const tueste of producto.tuestes ?? []) {
      if (!existeFoto(tueste.fotoGrano)) {
        errores.push(
          `La foto del tueste '${tueste.fotoGrano}' de '${producto.id}' no existe en public/.`
        );
      }
    }

    const hayFotosPorPresentacion = producto.presentaciones.some(
      (presentacion) => presentacion.foto
    );

    for (const presentacion of producto.presentaciones) {
      if (presentacion.foto && !existeFoto(presentacion.foto)) {
        errores.push(
          `La foto '${presentacion.foto}' de la presentación '${presentacion.nombre}' del producto '${producto.id}' no existe en public/.`
        );
      } else if (hayFotosPorPresentacion && !presentacion.foto) {
        errores.push(
          `Falta la foto de la presentación '${presentacion.nombre}' del producto '${producto.id}'.`
        );
      }
    }
  }

  return errores;
}

/**
 * Valida los archivos referenciados por las situaciones de la sección 04.
 *
 * Cuando una foto falte, el error por una ruta mal escrita aparece en el build
 * y no como una imagen rota en producción, que es justo el caso que este módulo
 * existe para evitar.
 */
export function validarFotosSituaciones(): string[] {
  const errores: string[] = [];

  for (const situacion of SITUACIONES) {
    if (situacion.foto === PENDIENTE) {
      continue;
    }

    if (!existeFoto(situacion.foto)) {
      errores.push(
        `La foto '${situacion.foto}' de la situación '${situacion.id}' no existe en public/.`
      );
    }
  }

  return errores;
}

/**
 * Valida la fotografía del cierre editorial de compromiso social.
 *
 * Mientras la banda no tenga foto propia el campo es PENDIENTE y no hay nada
 * que comprobar; en cuanto se ponga una ruta, un error de escritura debe ser
 * un fallo de build y no una imagen rota en la última sección de la página.
 */
export function validarFotoCompromiso(): string[] {
  if (COMPROMISO.foto === PENDIENTE || existeFoto(COMPROMISO.foto)) {
    return [];
  }

  return [
    `La foto '${COMPROMISO.foto}' de la sección de compromiso no existe en public/.`,
  ];
}

/**
 * Ejecuta todas las validaciones de disco y lanza si alguna falla.
 *
 * Pensado para el build: una foto que no existe es un error de publicación,
 * no una imagen rota en producción. El caso no es hipotético: las rutas de
 * `public/` distinguen mayúsculas, así que `/images/cafe-lavado.jpg` no
 * encuentra `Cafe_Lavado.jpg` en un despliegue en Linux aunque funcione en
 * una máquina con Windows.
 */
export function validarDatosEnDisco(): void {
  const errores = [
    ...validarFotosCatalogo(),
    ...validarFotosSituaciones(),
    ...validarFotoCompromiso(),
  ];

  if (errores.length > 0) {
    throw new Error(`Datos que no pasan la validación:\n- ${errores.join("\n- ")}`);
  }
}