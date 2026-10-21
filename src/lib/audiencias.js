import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

export const ORDEN_PRIORIDAD = { urgente: 0, alta: 1, normal: 2, baja: 3 };

export const PRIORIDAD = {
  urgente: { label: 'Urgente', icono: '⚡', badge: 'bg-red-500/15 text-red-300 border-red-500/30',       borde: 'border-l-red-500',   card: 'bg-red-500/5' },
  alta:    { label: 'Alta',    icono: '↑',  badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30', borde: 'border-l-amber-500', card: '' },
  normal:  { label: 'Normal',  icono: '→',  badge: 'bg-accent/10 text-accent border-accent/25',         borde: 'border-l-accent/50', card: '' },
  baja:    { label: 'Baja',    icono: '↓',  badge: 'bg-white/5 text-white/60 border-white/15',          borde: 'border-l-white/20',  card: '' },
};

export const ordenarPorPrioridad = (rows) =>
  [...rows].sort((a, b) =>
    (ORDEN_PRIORIDAD[a.prioridad] ?? 2) - (ORDEN_PRIORIDAD[b.prioridad] ?? 2)
    || new Date(a.created_at) - new Date(b.created_at));

const SELECT_AUDIENCIA = `id, person_id, motivo, estado, prioridad, area_id, created_at,
  tipo_respuesta, respuesta, respondido_at, respondido_por, observaciones_area,
  persona:persons!person_id(id, apellido_nombre, dni),
  area:areas!area_id(id, name)`;

/**
 * Bandeja de audiencias con actualización en tiempo real.
 * Pensada para celular: al volver a la app (pantalla desbloqueada, cambio de pestaña
 * o vuelve la señal) recarga, porque el canal en tiempo real se corta en segundo plano.
 */
export function useAudiencias({ estado, areaId = null, habilitado = true, canal }) {
  const [audiencias, setAudiencias] = useState([]);
  const [loading, setLoading] = useState(habilitado);
  const [error, setError] = useState('');
  const pedidoActual = useRef(0);

  // Trae los datos. No toca el estado antes del primer await (se llama desde un efecto).
  const cargar = useCallback(async () => {
    if (!habilitado) return;
    const pedido = ++pedidoActual.current;
    let q = supabase.from('audiencias').select(SELECT_AUDIENCIA).eq('estado', estado);
    if (areaId) q = q.eq('area_id', areaId);
    const { data, error: err } = await q.order('created_at', { ascending: true });
    if (pedido !== pedidoActual.current) return; // llegó una respuesta más nueva
    if (err) {
      setError('No se pudo actualizar la bandeja. Revisá la conexión.');
    } else {
      setError('');
      setAudiencias(ordenarPorPrioridad(data || []));
    }
    setLoading(false);
  }, [estado, areaId, habilitado]);

  // Botón "Actualizar": muestra el indicador de carga
  const recargar = useCallback(() => {
    setLoading(true);
    return cargar();
  }, [cargar]);

  useEffect(() => {
    if (!habilitado) return undefined;
    // cargar() solo actualiza el estado después de la respuesta de la red (patrón de suscripción)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();

    const channel = supabase
      .channel(canal)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audiencias' }, () => cargar())
      .subscribe();

    const alVolver = () => {
      if (document.visibilityState === 'visible') cargar();
    };
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('online', cargar);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('online', cargar);
    };
  }, [cargar, habilitado, canal]);

  return { audiencias, setAudiencias, loading, error, recargar };
}

/**
 * Actualiza una audiencia y CONFIRMA que se guardó.
 * Con RLS, un update sin permiso no da error: simplemente no cambia filas.
 * Por eso se pide la fila de vuelta y se trata "0 filas" como error.
 */
export async function actualizarAudiencia(id, cambios) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { error: new Error('Sin conexión. No se guardó; probá de nuevo cuando tengas señal.') };
  }
  const { data, error } = await supabase
    .from('audiencias')
    .update({ ...cambios, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id');
  if (error) {
    const sinRed = /fetch|network|timeout|conex/i.test(error.message || '');
    return { error: new Error(sinRed
      ? 'Sin conexión con el servidor. No se guardó; probá de nuevo en un momento.'
      : 'No se pudo guardar: ' + error.message) };
  }
  if (!data || data.length === 0) return { error: new Error('No se pudo guardar (sin permiso o la audiencia ya no existe).') };
  return { error: null };
}

/** Copia de los campos que cambia una respuesta, para poder deshacerla. */
export const fotoAudiencia = (a) => ({
  estado: a.estado,
  area_id: a.area_id,
  prioridad: a.prioridad,
  tipo_respuesta: a.tipo_respuesta ?? null,
  respuesta: a.respuesta ?? null,
  respondido_at: a.respondido_at ?? null,
  respondido_por: a.respondido_por ?? null,
  observaciones_area: a.observaciones_area ?? null,
});
