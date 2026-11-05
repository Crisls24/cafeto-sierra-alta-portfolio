/**
 * Formateo del teléfono de `data/empresa.ts` para mostrarlo en pantalla.
 * El número crudo vive en un solo lugar (formato internacional, solo
 * dígitos) y aquí solo cambia de forma para la lectura humana.
 */

/** Separa en grupos de 3 desde la izquierda ("7712023" → "771 202 3"). */
function enGruposDeTres(digitos: string): string {
  return digitos.match(/.{1,3}/g)?.join(" ") ?? digitos;
}

/**
 * Número mexicano legible a partir de su formato internacional.
 *
 * Con prefijo de país 52 y 12 dígitos se quita el 52 y se agrupa 3-3-4,
 * que es como se marca en México. Cualquier otro largo se agrupa en
 * grupos de 3 desde la izquierda, sin inventar una estructura que podría
 * estar mal.
 */
export function telefonoLegible(numero: string): string {
  const soloDigitos = numero.replace(/\D/g, "");
  const esMexicano = soloDigitos.startsWith("52") && soloDigitos.length === 12;
  const nacional = esMexicano ? soloDigitos.slice(2) : soloDigitos;

  if (nacional.length === 10) {
    return `${nacional.slice(0, 3)} ${nacional.slice(3, 6)} ${nacional.slice(6)}`;
  }

  return enGruposDeTres(nacional);
}
