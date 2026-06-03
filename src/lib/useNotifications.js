import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabase';

/**
 * useNotifications
 * Escucha en tiempo real las derivaciones (audiencias con estado DERIVADO)
 * para el área del usuario logueado.
 *
 * Retorna:
 *   - unreadCount: número de derivaciones no vistas
 *   - notifications: array con los datos de cada derivación nueva
 *   - markAllRead: función para marcar todo como leído (limpia el badge)
 *   - clearNotification: función para eliminar una notificación puntual
 */
export function useNotifications(profile) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  // Guardamos los IDs ya conocidos para saber cuáles son nuevos
  const knownIds = useRef(new Set());
  const isSuperAdmin = profile?.role === 'superadmin';
  const areaId = profile?.areas?.id;

  // Carga inicial: audiencias DERIVADO para el área (o todas si superadmin)
  const loadInitial = useCallback(async () => {
    if (!profile) return;
    let q = supabase
      .from('audiencias')
      .select(`id, person_id, motivo, prioridad, area_id, created_at,
        persona:persons!person_id(apellido_nombre, dni),
        area:areas!area_id(name)`)
      .eq('estado', 'DERIVADO')
      .order('created_at', { ascending: false });

    if (!isSuperAdmin && areaId) {
      q = q.eq('area_id', areaId);
    } else if (!isSuperAdmin) {
      return; // Sin área asignada
    }

    const { data } = await q;
    if (data) {
      // En la carga inicial registramos los IDs como "ya conocidos"
      // para que no disparen notificaciones al entrar
      data.forEach(d => knownIds.current.add(d.id));
    }
  }, [profile, isSuperAdmin, areaId]);

  useEffect(() => {
    if (!profile) return;
    loadInitial();

    // Canal Realtime: escucha INSERT y UPDATE en audiencias
    const channelName = isSuperAdmin
      ? 'notif-superadmin'
      : `notif-area-${areaId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audiencias' },
        async (payload) => {
          const row = payload.new;
          // Solo nos interesa si está DERIVADO y es para nuestra área (o superadmin)
          if (row.estado !== 'DERIVADO') return;
          if (!isSuperAdmin && row.area_id !== areaId) return;
          if (knownIds.current.has(row.id)) return;

          knownIds.current.add(row.id);
          await agregarNotificacion(row);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'audiencias' },
        async (payload) => {
          const row = payload.new;
          const old = payload.old;

          // Una audiencia se DERIVÓ (cambió a DERIVADO y es para nuestra área)
          const fueDerivada = row.estado === 'DERIVADO' && old.estado !== 'DERIVADO';
          const esParaNosotros = isSuperAdmin || row.area_id === areaId;

          if (fueDerivada && esParaNosotros && !knownIds.current.has(row.id)) {
            knownIds.current.add(row.id);
            await agregarNotificacion(row);
          }

          // Si la audiencia fue atendida/resuelta, quitar notificación si existía
          if (row.estado !== 'DERIVADO') {
            setNotifications(prev => prev.filter(n => n.id !== row.id));
            setUnreadCount(prev => {
              // Solo decrementar si esa notificación estaba en la lista
              const estaba = prev > 0;
              return estaba ? Math.max(0, prev - 1) : 0;
            });
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [profile, isSuperAdmin, areaId]);

  const agregarNotificacion = async (row) => {
    // Enrich con datos de persona y área si no vienen en el payload
    let persona = row.persona;
    let area = row.area;

    if (!persona || !area) {
      const { data } = await supabase
        .from('audiencias')
        .select(`persona:persons!person_id(apellido_nombre, dni), area:areas!area_id(name)`)
        .eq('id', row.id)
        .maybeSingle();
      if (data) {
        persona = data.persona;
        area = data.area;
      }
    }

    const notif = {
      id: row.id,
      personaNombre: persona?.apellido_nombre || 'Persona desconocida',
      personaDni: persona?.dni || '-',
      areaNombre: area?.name || 'Área desconocida',
      motivo: row.motivo || 'Sin motivo',
      prioridad: row.prioridad || 'normal',
      timestamp: new Date(),
    };

    setNotifications(prev => [notif, ...prev].slice(0, 20)); // máximo 20
    setUnreadCount(prev => prev + 1);
  };

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const clearNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  return { unreadCount, notifications, markAllRead, clearNotification };
}