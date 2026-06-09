import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const PRIORIDAD = {
  urgente: { label: 'Urgente', badge: 'bg-red-500/12 text-red-400 border-red-500/25',   border: 'border-l-red-500/60',    card: 'border-red-500/20 bg-red-500/4' },
  alta:    { label: 'Alta',    badge: 'bg-amber-500/12 text-amber-400 border-amber-500/25', border: 'border-l-amber-500/60', card: 'border-amber-500/15' },
  normal:  { label: 'Normal',  badge: 'bg-accent2/12 text-accent border-accent/25',      border: 'border-l-accent2/40',    card: '' },
  baja:    { label: 'Baja',    badge: 'bg-white/8 text-white/30 border-white/10',        border: 'border-l-white/10',      card: 'opacity-80' },
};

function Avatar({ name }) {
  const initials = name ? name.trim().split(/[, ]+/).slice(0, 2).reverse().map(w => w[0]).join('').toUpperCase() : '?';
  return (
    <div className="w-9 h-9 rounded-xl bg-accent2/15 flex items-center justify-center text-accent text-xs font-bold shrink-0">
      {initials}
    </div>
  );
}

export default function DashboardIntendencia({ profile, onViewPerson }) {
  const [audiencias, setAudiencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [derivandoId, setDerivandoId] = useState(null);
  const [respondiendo, setRespondiendo] = useState(null);
  // { id, tipo: 'atendido' | 'no_atendido' | 'derivado' }
  const [respuestaTexto, setRespuestaTexto] = useState('');
  const [areas, setAreas] = useState([]);

  const fetchAudiencias = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('audiencias')
      .select(`id, person_id, motivo, estado, prioridad, area_id, created_at,
        persona:persons!person_id(id, apellido_nombre, dni),
        area:areas!area_id(id, name)`)
      .eq('estado', 'PENDIENTE')
      .order('created_at', { ascending: true });

    if (!error) {
      const orden = { urgente: 0, alta: 1, normal: 2, baja: 3 };
      const rows = (data || []).sort((a, b) => (orden[a.prioridad] ?? 2) - (orden[b.prioridad] ?? 2));
      setAudiencias(rows);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchAudiencias();
    const channel = supabase
      .channel('audiencias-realtime-int')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audiencias' }, fetchAudiencias)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchAudiencias]);

  useEffect(() => {
    supabase.from('areas').select('id, name').then(({ data }) => setAreas(data || []));
  }, []);

  const handleResponder = async (id, tipo, areaDestinoId = null) => {
    const updateData = {
      respuesta: respuestaTexto || null,
      tipo_respuesta: tipo,
      respondido_at: new Date().toISOString(),
      estado: tipo === 'derivado' ? 'DERIVADO' : tipo === 'atendido' ? 'ATENDIDO' : 'NO_ATENDIDO',
    };
    if (tipo === 'derivado' && areaDestinoId) {
      updateData.area_id = areaDestinoId;
    }
    await supabase.from('audiencias').update(updateData).eq('id', id);
    setAudiencias(prev => prev.filter(a => a.id !== id));
    setRespondiendo(null);
    setRespuestaTexto('');
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
    <section className="space-y-6 fade-in">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Personas para atención</h2>
          <p className="text-xs text-muted mt-1">Bandeja de audiencias pendientes</p>
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

      {/* Cards */}
      {loading ? (
        <div className="text-center py-20 text-muted text-xs opacity-50">Cargando audiencias...</div>
      ) : audiencias.length === 0 ? (
        <div className="card text-center py-20">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-white font-medium text-sm">Sin audiencias pendientes</p>
          <p className="text-muted text-xs mt-1">La bandeja está al día</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {audiencias.map((a) => {
            const prio = PRIORIDAD[a.prioridad] || PRIORIDAD.normal;
            const fechaHora = new Date(a.created_at);

            return (
              <div
                key={a.id}
                className={`card border-l-2 py-4 px-5 transition-all duration-200 ${prio.border} ${prio.card}`}
              >
                <div className="flex flex-col md:flex-row md:items-start gap-4">

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar name={a.persona?.apellido_nombre} />
                      <div className="min-w-0">
                        <p className="text-white font-medium text-sm truncate">
                          {a.persona?.apellido_nombre || 'Sin nombre'}
                        </p>
                        <p className="text-muted text-xs font-mono">DNI {a.persona?.dni || '-'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-medium ${prio.badge}`}>
                        {prio.label}
                      </span>
                      <span className="pill text-[10px]">{a.area?.name || 'Sin área'}</span>
                      <span className="text-[10px] text-white/25 font-mono">
                        {fechaHora.toLocaleDateString()} {fechaHora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {a.motivo && (
                      <p className="text-white/40 text-xs leading-relaxed line-clamp-2">{a.motivo}</p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col gap-2 w-full md:w-52 shrink-0">

                    {/* Select de prioridad — sin cambios */}
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

                    {/* Ver ficha */}
                    <button
                      className="secondary w-full py-2 text-xs"
                      onClick={() => onViewPerson?.(a.persona?.id || a.person_id, 'screenDashboardIntendencia')}
                      disabled={!a.persona?.id && !a.person_id}
                    >
                      Ver ficha
                    </button>

                    {/* Panel de respuesta */}
                    {respondiendo?.id === a.id ? (
                      <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/3 border border-white/8">
                        
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                          Respuesta para Mesa de Entrada
                        </p>

                        <textarea
                          placeholder="Observaciones / detalle de la respuesta (opcional)..."
                          value={respuestaTexto}
                          onChange={e => setRespuestaTexto(e.target.value)}
                          rows={2}
                          className="text-xs resize-none"
                        />

                        {/* Si eligió derivar: mostrar selector de área */}
                        {respondiendo.tipo === 'derivado' && (
                          <div className="flex flex-col gap-1">
                            <p className="text-[10px] text-muted px-0.5">Derivar a:</p>
                            {areas.filter(ar => {
                              const n = ar.name?.toLowerCase();
                              return n !== 'mesa de entrada' && n !== 'intendencia';
                            }).map(ar => (
                              <button
                                key={ar.id}
                                onClick={() => handleResponder(a.id, 'derivado', ar.id)}
                                className="w-full text-left px-3 py-2 rounded-lg bg-white/4 border 
                                           border-white/8 text-xs text-white/60 hover:bg-accent2/10 
                                           hover:text-accent hover:border-accent/20 transition-all"
                              >
                                → {ar.name}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Si eligió atendido o no_atendido: botón confirmar */}
                        {respondiendo.tipo !== 'derivado' && (
                          <button
                            onClick={() => handleResponder(a.id, respondiendo.tipo)}
                            className={`w-full py-2 text-xs font-bold rounded-xl transition-all ${
                              respondiendo.tipo === 'atendido'
                                ? 'bg-teal-500/15 border border-teal-500/25 text-teal-400 hover:bg-teal-500/25'
                                : 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
                            }`}
                          >
                            {respondiendo.tipo === 'atendido' ? '✓ Confirmar atención' : '✗ Confirmar no atención'}
                          </button>
                        )}

                        <button
                          onClick={() => { setRespondiendo(null); setRespuestaTexto(''); }}
                          className="w-full py-1.5 text-xs text-muted hover:text-white transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>

                    ) : (

                      /* Botones de respuesta rápida */
                      <div className="flex flex-col gap-1.5">
                        <p className="text-[9px] font-black text-white/25 uppercase tracking-widest px-0.5">
                          Responder a Mesa de Entrada
                        </p>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            onClick={() => { setRespondiendo({ id: a.id, tipo: 'atendido' }); setRespuestaTexto(''); }}
                            className="py-2 text-[10px] font-bold rounded-xl bg-teal-500/10 border 
                                       border-teal-500/20 text-teal-400 hover:bg-teal-500/20 transition-all"
                            title="Se atiende"
                          >
                            ✓ Atiende
                          </button>
                          <button
                            onClick={() => { setRespondiendo({ id: a.id, tipo: 'no_atendido' }); setRespuestaTexto(''); }}
                            className="py-2 text-[10px] font-bold rounded-xl bg-red-500/8 border 
                                       border-red-500/18 text-red-400 hover:bg-red-500/15 transition-all"
                            title="No se atiende"
                          >
                            ✗ No atiende
                          </button>
                          <button
                            onClick={() => { setRespondiendo({ id: a.id, tipo: 'derivado' }); setRespuestaTexto(''); }}
                            className="py-2 text-[10px] font-bold rounded-xl bg-amber-500/8 border 
                                       border-amber-500/20 text-amber-400 hover:bg-amber-500/15 transition-all"
                            title="Derivar a otra área"
                          >
                            → Deriva
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}