import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from './supabase';

export function useNotifications(profile) {
  // Cada notificación lleva su propio estado de lectura; el contador se calcula a partir de la lista.
  // Antes el contador era un número aparte que bajaba con CUALQUIER cambio en audiencias,
  // aunque fuera de otra área, y podía quedar en 0 con derivaciones sin leer.
  const [notifications, setNotifications] = useState([]);
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
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
      read:          false,
    };

    setNotifications(prev => [notif, ...prev.filter(n => n.id !== notif.id)].slice(0, 20));
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

          // No dependemos de payload.old: sin REPLICA IDENTITY FULL viene vacío, y con él
          // una re-derivación entre áreas (DERIVADO → DERIVADO) no se notificaba.
          const estaDerivada   = row.estado === 'DERIVADO';
          const esParaNosotros = isSuperAdmin || row.area_id === areaId;

          if (estaDerivada && esParaNosotros && !knownIds.current.has(row.id)) {
            knownIds.current.add(row.id);
            await agregarNotificacion(row);
          }

          // Si ya no está DERIVADO (o se derivó a otra área), sacarla de la lista.
          // Solo afecta a notificaciones que estaban en la lista; el contador se recalcula solo.
          if (row.estado !== 'DERIVADO' || (!isSuperAdmin && row.area_id !== areaId)) {
            setNotifications(prev => prev.filter(n => n.id !== row.id));
            knownIds.current.delete(row.id);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[Notif] Error en canal:', channelName, status);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  // Re-ejecutar si cambia el perfil o el área (ej: admin cambia de área)
  }, [profile, isSuperAdmin, areaId, agregarNotificacion]);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.some(n => !n.read) ? prev.map(n => ({ ...n, read: true })) : prev);
  }, []);

  const clearNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return { unreadCount, notifications, markAllRead, clearNotification };
}