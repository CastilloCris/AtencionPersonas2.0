import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabase';

export function useNotifications(profile) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const knownIds = useRef(new Set());

  const isSuperAdmin = profile?.role === 'superadmin';
  // profile.areas viene del join areas!default_area_id(id,name) en App.jsx
  const areaId = profile?.areas?.id ?? null;

  // agregarNotificacion definida con useCallback para poder usarla en el efecto
  const agregarNotificacion = useCallback(async (row) => {
    let persona = row.persona ?? null;
    let area    = row.area    ?? null;

    // El payload de Realtime no trae joins → los pedimos aparte
    if (!persona || !area) {
      const { data } = await supabase
        .from('audiencias')
        .select('persona:persons!person_id(apellido_nombre, dni), area:areas!area_id(name)')
        .eq('id', row.id)
        .maybeSingle();
      if (data) { persona = data.persona; area = data.area; }
    }

    const notif = {
      id:            row.id,
      personaNombre: persona?.apellido_nombre || 'Persona desconocida',
      personaDni:    persona?.dni             || '-',
      areaNombre:    area?.name               || 'Área desconocida',
      motivo:        row.motivo               || 'Sin motivo',
      prioridad:     row.prioridad            || 'normal',
      timestamp:     new Date(),
    };

    setNotifications(prev => [notif, ...prev].slice(0, 20));
    setUnreadCount(prev => prev + 1);
  }, []);

  useEffect(() => {
    // Esperar a que el perfil esté cargado
    if (!profile) return;
    // Un operador sin área asignada no recibe notificaciones
    if (!isSuperAdmin && !areaId) return;

    // ── Carga inicial: marcar como conocidos los DERIVADO actuales ───────────
    // (evita que al entrar exploten notificaciones de derivaciones viejas)
    const loadInitial = async () => {
      let q = supabase
        .from('audiencias')
        .select('id')
        .eq('estado', 'DERIVADO');
      if (!isSuperAdmin) q = q.eq('area_id', areaId);
      const { data } = await q;
      (data || []).forEach(d => knownIds.current.add(d.id));
    };
    loadInitial();

    // ── Canal Realtime ───────────────────────────────────────────────────────
    // Nombre único por usuario para evitar conflictos de canal duplicado
    const channelName = isSuperAdmin
      ? `notif-superadmin-${profile.user_id}`
      : `notif-area-${areaId}-${profile.user_id}`;

    const channel = supabase
      .channel(channelName)
      // Nuevas audiencias creadas directamente como DERIVADO
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audiencias' },
        async (payload) => {
          const row = payload.new;
          if (row.estado !== 'DERIVADO') return;
          if (!isSuperAdmin && row.area_id !== areaId) return;
          if (knownIds.current.has(row.id)) return;
          knownIds.current.add(row.id);
          await agregarNotificacion(row);
        }
      )
      // Audiencias actualizadas (Intendencia las deriva mediante UPDATE)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'audiencias' },
        async (payload) => {
          const row = payload.new;
          const old = payload.old;

          const fueDerivada    = row.estado === 'DERIVADO' && old.estado !== 'DERIVADO';
          const esParaNosotros = isSuperAdmin || row.area_id === areaId;

          if (fueDerivada && esParaNosotros && !knownIds.current.has(row.id)) {
            knownIds.current.add(row.id);
            await agregarNotificacion(row);
          }

          // Si ya no está DERIVADO, sacarla de la lista
          if (row.estado !== 'DERIVADO') {
            setNotifications(prev => prev.filter(n => n.id !== row.id));
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Notif] Canal suscrito:', channelName);
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[Notif] Error en canal:', channelName, status);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  // Re-ejecutar si cambia el perfil o el área (ej: admin cambia de área)
  }, [profile, isSuperAdmin, areaId, agregarNotificacion]);

  const markAllRead = useCallback(() => setUnreadCount(0), []);

  const clearNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  return { unreadCount, notifications, markAllRead, clearNotification };
}