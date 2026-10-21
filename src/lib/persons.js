import { supabase } from './supabase';
import { normalizarDni } from './texto';

/**
 * Guarda una persona sin pisar datos existentes.
 *
 * - Si el DNI no existe: la crea con los campos recibidos.
 * - Si el DNI ya existe: actualiza SOLO los campos que vienen con valor.
 *   Un campo vacío en el formulario nunca borra un dato ya cargado.
 *
 * @param {object} campos  { dni, apellido_nombre, fecha_nacimiento, domicilio, telefono, estado_civil, trabaja_actualmente }
 * @returns {{ data: object|null, error: object|null, creada: boolean }}
 */
export async function guardarPersona(campos) {
  const dni = normalizarDni(campos.dni);
  if (!dni) return { data: null, error: new Error('El DNI es obligatorio.'), creada: false };

  const conValor = {};
  for (const [k, v] of Object.entries(campos)) {
    if (k === 'dni') continue;
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    conValor[k] = typeof v === 'string' ? v.trim() : v;
  }

  const { data: existente, error: errBusqueda } = await supabase
    .from('persons')
    .select('id')
    .eq('dni', dni)
    .maybeSingle();
  if (errBusqueda) return { data: null, error: errBusqueda, creada: false };

  if (existente) {
    const { data, error } = await supabase
      .from('persons')
      .update({ ...conValor, updated_at: new Date().toISOString() })
      .eq('id', existente.id)
      .select('*')
      .single();
    return { data, error, creada: false };
  }

  const { data, error } = await supabase
    .from('persons')
    .insert({ dni, ...conValor })
    .select('*')
    .single();
  return { data, error, creada: true };
}
