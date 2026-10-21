// Utilidades de fecha que respetan la hora local (Argentina, UTC-3).
// Evitan dos errores clásicos:
//  - new Date().toISOString() usa UTC: después de las 21 h devuelve el día siguiente.
//  - new Date('1990-05-10') se interpreta como UTC: en Argentina se muestra 09/05/1990.

const pad = (n) => String(n).padStart(2, '0');

/** Fecha de hoy en formato 'YYYY-MM-DD' según la hora local. */
export const hoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Convierte 'YYYY-MM-DD' (o un timestamp) en Date local, sin corrimiento de zona horaria. */
export const parseFechaLocal = (valor) => {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valor));
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Formatea una fecha (solo día) como dd/mm/aaaa. Devuelve `vacio` si no hay valor. */
export const formatFecha = (valor, vacio = '—') => {
  const d = parseFechaLocal(valor);
  return d ? d.toLocaleDateString('es-AR') : vacio;
};

/** Edad en años cumplidos a partir de una fecha de nacimiento. */
export const calcularEdad = (fechaNac) => {
  const nac = parseFechaLocal(fechaNac);
  if (!nac) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad >= 0 ? edad : null;
};

/** "hace 5 min", "hace 3 h", "ayer", "hace 4 días" o la fecha si es más vieja. */
export const haceCuanto = (valor) => {
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return '';
  const seg = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (seg < 60) return 'recién';
  const min = Math.floor(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.floor(h / 24);
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  return d.toLocaleDateString('es-AR');
};
