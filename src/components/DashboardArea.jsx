import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const PRIORIDAD = {
  urgente: { label: 'Urgente', badge: 'bg-red-500/12 text-red-400 border-red-500/25',    border: 'border-l-red-500/60',    card: 'border-red-500/20 bg-red-500/4' },
  alta:    { label: 'Alta',    badge: 'bg-amber-500/12 text-amber-400 border-amber-500/25', border: 'border-l-amber-500/60', card: 'border-amber-500/15' },
  normal:  { label: 'Normal',  badge: 'bg-accent2/12 text-accent border-accent/25',       border: 'border-l-accent2/40',   card: '' },
  baja:    { label: 'Baja',    badge: 'bg-white/8 text-white/30 border-white/10',         border: 'border-l-white/10',     card: 'opacity-80' },
};

function Avatar({ name }) {
  const initials = name ? name.trim().split(/[, ]+/).slice(0, 2).reverse().map(w => w[0]).join('').toUpperCase() : '?';
  return (
    <div className="w-9 h-9 rounded-xl bg-accent2/15 flex items-center justify-center text-accent text-xs font-bold shrink-0">
      {initials}
    </div>
  );
}

function AtenderModal({ audiencia, onConfirm, onClose }) {
  const [observacion, setObservacion] = useState('');
  const [prestacion, setPrestacion] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm({ observacion, prestacion });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md border border-white/10 rounded-2xl">
        <div className="mb-5">
          <h3 className="text-white font-semibold text-sm mb-1">Marcar como atendida</h3>
          <p className="text-muted text-xs">{audiencia.persona?.apellido_nombre} — DNI {audiencia.persona?.dni}</p>
        </div>
        <div className="space-y-4">
          <div>
            <label>Prestación otorgada (opcional)</label>
            <input
              type="text"
              value={prestacion}
              onChange={e => setPrestacion(e.target.value)}
              placeholder="Ej: Módulos alimenticios, ayuda económica..."
            />
          </div>
          <div>
            <label>Observaciones</label>
            <textarea
              value={observacion}
              onChange={e => setObservacion(e.target.value)}
              placeholder="Descripción de la atención brindada..."
              rows={3}
              className="resize-none"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="secondary flex-1 py-2.5 text-sm">Cancelar</button>
          <button onClick={handleConfirm} disabled={loading} className="primary flex-1 py-2.5 text-sm disabled:opacity-50">
            {loading ? 'Guardando...' : '✓ Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardArea({ profile, onViewPerson }) {
  const [audiencias, setAudiencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [areas, setAreas] = useState([]);
  const [derivandoId, setDerivandoId] = useState(null);
  const [atendiendo, setAtendiendo] = useState(null);

  const areaId = profile?.areas?.id;
  const areaNombre = profile?.areas?.name || 'Mi Área';

  const fetchAudiencias = useCallback(async () => {
    if (!areaId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('audiencias')
      .select(`id, person_id, motivo, estado, prioridad, area_id, created_at,
        persona:persons!person_id(id, apellido_nombre, dni),
        area:areas!area_id(id, name)`)
      .eq('estado', 'DERIVADO')
      .eq('area_id', areaId)
      .order('created_at', { ascending: true });

    if (!error) {
      const orden = { urgente: 0, alta: 1, normal: 2, baja: 3 };
      setAudiencias((data || []).sort((a, b) => (orden[a.prioridad] ?? 2) - (orden[b.prioridad] ?? 2)));
    }
    setLoading(false);
  }, [areaId]);

  useEffect(() => {
    fetchAudiencias();
    supabase.from('areas').select('id, name').then(({ data }) => setAreas(data || []));
    const channel = supabase
      .channel(`area-${areaId}-realtime`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audiencias' }, fetchAudiencias)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchAudiencias, areaId]);

  const handleAtender = async ({ observacion, prestacion }) => {
    if (!atendiendo) return;
    const obs = [prestacion ? `Prestación: ${prestacion}` : null, observacion || null].filter(Boolean).join('\n') || null;
    await supabase.from('audiencias').update({ estado: 'ATENDIDO', observaciones_area: obs }).eq('id', atendiendo.id);
    setAudiencias(prev => prev.filter(a => a.id !== atendiendo.id));
    setAtendiendo(null);
  };

  const handleDerivar = async (id, areaDestinoId) => {
    await supabase.from('audiencias').update({ estado: 'DERIVADO', area_id: areaDestinoId }).eq('id', id);
    setAudiencias(prev => prev.filter(a => a.id !== id));
    setDerivandoId(null);
  };

  const handleChangePrioridad = async (id, val) => {
    await supabase.from('audiencias').update({ prioridad: val }).eq('id', id);
    setAudiencias(prev => {
      const orden = { urgente: 0, alta: 1, normal: 2, baja: 3 };
      return prev.map(a => a.id === id ? { ...a, prioridad: val } : a)
        .sort((a, b) => (orden[a.prioridad] ?? 2) - (orden[b.prioridad] ?? 2));
    });
  };

  const urgentes = audiencias.filter(a => a.prioridad === 'urgente').length;

  return (
    <>
      {atendiendo && <AtenderModal audiencia={atendiendo} onConfirm={handleAtender} onClose={() => setAtendiendo(null)} />}

      <section className="space-y-6 fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Bandeja — {areaNombre}</h2>
            <p className="text-xs text-muted mt-1">Derivaciones recibidas</p>
          </div>
          <div className="flex items-center gap-2">
            {urgentes > 0 && (
              <span className="px-3 py-1.5 rounded-lg bg-red-500/12 border border-red-500/25 text-red-400 text-xs font-medium animate-pulse">
                ⚡ {urgentes} urgente{urgentes > 1 ? 's' : ''}
              </span>
            )}
            <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-white/60 text-xs">
              {audiencias.length} pendientes
            </span>
            <button className="secondary py-2 px-4 text-xs" onClick={fetchAudiencias} disabled={loading}>
              {loading ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted text-xs opacity-50">Cargando derivaciones...</div>
        ) : !areaId ? (
          <div className="card text-center py-20">
            <p className="text-white font-medium text-sm">Sin área asignada</p>
            <p className="text-muted text-xs mt-1">Contactá al administrador del sistema</p>
          </div>
        ) : audiencias.length === 0 ? (
          <div className="card text-center py-20">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white font-medium text-sm">Sin derivaciones pendientes</p>
            <p className="text-muted text-xs mt-1">La bandeja de {areaNombre} está al día</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {audiencias.map((a) => {
              const prio = PRIORIDAD[a.prioridad] || PRIORIDAD.normal;
              const fechaHora = new Date(a.created_at);
              const isDerivando = derivandoId === a.id;

              return (
                <div key={a.id} className={`card border-l-2 py-4 px-5 transition-all duration-200 ${prio.border} ${prio.card}`}>
                  <div className="flex flex-col md:flex-row md:items-start gap-4">

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar name={a.persona?.apellido_nombre} />
                        <div className="min-w-0">
                          <p className="text-white font-medium text-sm truncate">{a.persona?.apellido_nombre || 'Sin nombre'}</p>
                          <p className="text-muted text-xs font-mono">DNI {a.persona?.dni || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-medium ${prio.badge}`}>{prio.label}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20">
                          Desde: {a.area?.name || '?'}
                        </span>
                        <span className="text-[10px] text-white/25 font-mono">
                          {fechaHora.toLocaleDateString()} {fechaHora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {a.motivo && <p className="text-white/40 text-xs leading-relaxed line-clamp-2">{a.motivo}</p>}
                    </div>

                    <div className="flex flex-col gap-2 w-full md:w-48 shrink-0">
                      <select
                        value={a.prioridad || 'normal'}
                        onChange={e => handleChangePrioridad(a.id, e.target.value)}
                        className="py-2 text-xs cursor-pointer"
                      >
                        <option value="baja">↓ Baja</option>
                        <option value="normal">→ Normal</option>
                        <option value="alta">↑ Alta</option>
                        <option value="urgente">⚡ Urgente</option>
                      </select>

                      {isDerivando ? (
                        <div className="flex flex-col gap-1.5">
                          <p className="text-[10px] text-muted px-1 mb-0.5">Re-derivar a:</p>
                          {areas.filter(ar => ar.id !== areaId).map(ar => (
                            <button
                              key={ar.id}
                              onClick={() => handleDerivar(a.id, ar.id)}
                              className="w-full text-left px-3 py-2 rounded-lg bg-white/4 border border-white/8 text-xs text-white/60 hover:bg-accent2/10 hover:text-accent hover:border-accent/20 transition-all"
                            >
                              → {ar.name}
                            </button>
                          ))}
                          <button onClick={() => setDerivandoId(null)} className="w-full px-3 py-2 rounded-lg text-xs text-muted hover:text-white transition-colors">
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            className="secondary flex-1 py-2 text-xs"
                            onClick={() => onViewPerson?.(a.persona?.id || a.person_id, 'screenDashboardArea')}
                            disabled={!a.persona?.id && !a.person_id}
                          >
                            Ver ficha
                          </button>
                          <button
                            className="flex-1 py-2 text-xs rounded-xl border border-amber-500/25 bg-amber-500/8 text-amber-400 hover:bg-amber-500/15 transition-all"
                            onClick={() => setDerivandoId(a.id)}
                          >
                            Re-derivar
                          </button>
                        </div>
                      )}

                      <button className="primary w-full py-2 text-xs" onClick={() => setAtendiendo(a)}>
                        ✓ Atender
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
