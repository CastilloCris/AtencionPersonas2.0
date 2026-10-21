/** Escapa texto para insertarlo en HTML generado a mano (impresiones). */
export const escapeHtml = (value, vacio = '-') => {
  if (value === null || value === undefined || value === '') return vacio;
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Limpia un término de búsqueda para usarlo dentro de filtros .or() / .ilike() de Supabase.
 * Comas, paréntesis y comodines rompen la sintaxis del filtro o cambian su significado.
 */
export const limpiarBusqueda = (valor) =>
  String(valor || '')
    .replace(/[,()%*\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Deja solo los dígitos de un DNI. */
export const normalizarDni = (valor) => String(valor || '').replace(/\D/g, '');

/** DNI con puntos (12.345.678), para encontrar registros viejos cargados con formato. */
export const dniConPuntos = (dni) => normalizarDni(dni).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
