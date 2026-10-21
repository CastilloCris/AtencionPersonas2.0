import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAudiencias, actualizarAudiencia, fotoAudiencia, ordenarPorPrioridad, PRIORIDAD } from '../lib/audiencias';
import {
  CabeceraAudiencia, Motivo, SelectorPrioridad, HojaInferior, Aviso,
  EncabezadoBandeja, BandejaVacia, ErrorConexion, ErrorEnHoja,
} from './Bandeja/BandejaUI';

export default function DashboardArea({ profile, onViewPerson }) {
  const areaId = profile?.areas?.id ?? null;
  const areaNombre = profile?.areas?.name || 'Mi área';
  // El superadmin supervisa: ve las derivaciones de TODAS las áreas (igual que sus notificaciones)
  const esSuperadmin = profile?.role === 'superadmin';

  const { audiencias, setAudiencias, loading, error, recargar } = useAudiencias({
    estado: 'DERIVADO',
    areaId: esSuperadmin ? null : areaId,
    habilitado: esSuperadmin || !!areaId,
    canal: esSuperadmin ? 'audiencias-area-todas' : `audiencias-area-${areaId}`,
  });
  const [filtroArea, setFiltroArea] = useState('todas');
  const [areas, setAreas] = useState([]);
  const [accion, setAccion] = useState(null); // { audiencia, tipo: 'atender' | 'derivar' }
  const [prestacion, setPrestacion] = useState('');
  const [observacion, setObservacion] = useState('');
  const [areaDestino, setAreaDestino] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorHoja, setErrorHoja] = useState('');
  const [aviso, setAviso] = useState(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);

  useEffect(() => {
    supabase.from('areas').select('id, name').eq('active', true).order('name')
      .then(({ data }) => setAreas(data || []));
  }, []);

  const abrir = (audiencia, tipo) => {
    setAccion({ audiencia, tipo });
    setPrestacion('');
    setObservacion('');
    setAreaDestino('');
    setErrorHoja('');
  };
  const cerrar = useCallback(() => { if (!guardando) setAccion(null); }, [guardando]);

  const confirmar = async () => {
    const { audiencia, tipo } = accion;
    if (tipo === 'derivar' && !areaDestino) return;
    const antes = fotoAudiencia(audiencia);

    let cambios;
    if (tipo === 'atender') {
      const obs = [prestacion.trim() ? `Prestación: ${prestacion.trim()}` : null, observacion.trim() || null]
        .filter(Boolean).join('\n') || null;
      cambios = { estado: 'ATENDIDO', observaciones_area: obs };
    } else {
      cambios = { estado: 'DERIVADO', area_id: areaDestino };
    }

    setGuardando(true);
    const { error: err } = await actualizarAudiencia(audiencia.id, cambios);
    setGuardando(false);
    if (err) {
      setErrorHoja(err.message);
      return;
    }

    setAudiencias(prev => prev.filter(x => x.id !== audiencia.id));
    setAccion(null);
    const destino = tipo === 'derivar' ? areas.find(ar => ar.id === areaDestino)?.name : null;
    setAviso({
      mensaje: tipo === 'atender'
        ? `Atendida: ${audiencia.persona?.apellido_nombre || ''}`
        : `Derivada a ${destino}: ${audiencia.persona?.apellido_nombre || ''}`,
      onDeshacer: async () => {
        const { error: e2 } = await actualizarAudiencia(audiencia.id, antes);
        if (e2) { setAviso({ tipo: 'error', mensaje: 'No se pudo deshacer: ' + e2.message }); return; }
        setAudiencias(prev => ordenarPorPrioridad([...prev.filter(x => x.id !== audiencia.id), audiencia]));
      },
    });
  };

  const cambiarPrioridad = async (a, prioridad) => {
    const previa = a.prioridad;
    setAudiencias(prev => ordenarPorPrioridad(prev.map(x => x.id === a.id ? { ...x, prioridad } : x)));
    const { error: err } = await actualizarAudiencia(a.id, { prioridad });
    if (err) {
      setAudiencias(prev => ordenarPorPrioridad(prev.map(x => x.id === a.id ? { ...x, prioridad: previa } : x)));
      setAviso({ tipo: 'error', mensaje: err.message });
    }
  };

  // Filtro por área (solo superadmin). Los chips muestran cuántas hay en cada área.
  const conteoPorArea = esSuperadmin
    ? Object.values(audiencias.reduce((acc, a) => {
        const id = a.area_id || 'sin';
        acc[id] = acc[id] || { id, nombre: a.area?.name || 'Sin área', total: 0 };
        acc[id].total += 1;
        return acc;
      }, {})).sort((x, y) => x.nombre.localeCompare(y.nombre))
    : [];
  const filtroVigente = filtroArea !== 'todas' && !conteoPorArea.some(c => c.id === filtroArea) ? 'todas' : filtroArea;
  const visibles = esSuperadmin && filtroVigente !== 'todas'
    ? audiencias.filter(a => (a.area_id || 'sin') === filtroVigente)
    : audiencias;

  const urgentes = visibles.filter(a => a.prioridad === 'urgente').length;

  if (!esSuperadmin && !areaId) {
    return (
      <div className="card text-center py-16">
        <p className="text-white font-medium">Sin área asignada</p>
        <p className="text-muted text-sm mt-1">Contactá al administrador del sistema</p>
      </div>
    );
  }

  return (
    <section className="space-y-4 md:space-y-6 fade-in pb-24">
      <EncabezadoBandeja
        titulo={esSuperadmin ? 'Bandeja — Todas las áreas' : `Bandeja — ${areaNombre}`}
        subtitulo={esSuperadmin ? 'Derivaciones pendientes en todas las áreas' : `Derivaciones recibidas · ${areaNombre}`}
        total={visibles.length}
        urgentes={urgentes}
        loading={loading}
        onActualizar={() => recargar()}
      />

      <ErrorConexion mensaje={error} onReintentar={() => recargar()} />

      {esSuperadmin && conteoPorArea.length > 1 && (
        // Fila de filtros: en celular se desliza de costado dentro de su propio espacio
        <div className="-mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto custom-scrollbar" role="tablist" aria-label="Filtrar por área">
          <div className="flex gap-2 w-max pb-1">
            {[{ id: 'todas', nombre: 'Todas', total: audiencias.length }, ...conteoPorArea].map(c => {
              const activo = filtroVigente === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={activo}
                  onClick={() => setFiltroArea(c.id)}
                  className={`tap px-4! rounded-full border text-sm whitespace-nowrap transition-colors
                    ${activo ? 'bg-accent text-black border-accent font-semibold' : 'bg-white/5 text-white/80 border-white/15'}`}
                >
                  {c.nombre}
                  <span className={`ml-1 text-xs ${activo ? 'text-black/70' : 'text-white/50'}`}>{c.total}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loading && audiencias.length === 0 ? (
        <div className="text-center py-16 text-muted text-sm">Cargando derivaciones…</div>
      ) : visibles.length === 0 ? (
        <BandejaVacia
          titulo="Sin derivaciones pendientes"
          detalle={esSuperadmin ? 'Ninguna área tiene derivaciones sin atender' : `La bandeja de ${areaNombre} está al día`}
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visibles.map(a => {
            const prio = PRIORIDAD[a.prioridad] || PRIORIDAD.normal;
            const personaId = a.persona?.id || a.person_id;
            return (
              <article key={a.id} className={`card p-4! md:p-5! border-l-4 space-y-3 ${prio.borde} ${prio.card}`}>
                <CabeceraAudiencia a={a} etiquetaArea={esSuperadmin ? `En: ${a.area?.name || 'Sin área'}` : null} />
                <Motivo texto={a.motivo} />
                {a.respuesta && (
                  <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                    <p className="text-xs text-muted mb-0.5">Indicación de Intendencia</p>
                    <p className="text-sm text-white/80">{a.respuesta}</p>
                  </div>
                )}

                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <SelectorPrioridad value={a.prioridad} onChange={v => cambiarPrioridad(a, v)} />
                  <button
                    type="button"
                    className="secondary tap px-4! text-sm"
                    onClick={() => onViewPerson?.(personaId, 'screenDashboardArea')}
                    disabled={!personaId}
                  >
                    Ver ficha
                  </button>
                </div>

                <div className="grid grid-cols-[2fr_1fr] gap-2">
                  <button type="button" className="primary tap text-base font-semibold" onClick={() => abrir(a, 'atender')}>
                    ✓ Atender
                  </button>
                  <button
                    type="button"
                    onClick={() => abrir(a, 'derivar')}
                    className="tap px-2! text-sm font-semibold rounded-xl border bg-amber-500/10 border-amber-500/30 text-amber-300"
                  >
                    → Derivar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {accion && (
        <HojaInferior
          titulo={accion.tipo === 'atender' ? 'Marcar como atendida' : 'Derivar a otra área'}
          subtitulo={`${accion.audiencia.persona?.apellido_nombre || ''} · DNI ${accion.audiencia.persona?.dni || '—'}`}
          onClose={cerrar}
        >
          {accion.tipo === 'atender' ? (
            <>
              <div>
                <label htmlFor="area-prestacion">Prestación otorgada (opcional)</label>
                <input
                  id="area-prestacion"
                  value={prestacion}
                  onChange={e => setPrestacion(e.target.value)}
                  placeholder="Ej: módulo alimenticio, pasaje…"
                />
              </div>
              <div>
                <label htmlFor="area-observacion">Observaciones</label>
                <textarea
                  id="area-observacion"
                  rows={3}
                  value={observacion}
                  onChange={e => setObservacion(e.target.value)}
                  placeholder="Qué se hizo con esta persona…"
                  className="resize-none"
                />
              </div>
            </>
          ) : (
            <fieldset className="space-y-2">
              <legend className="text-sm text-muted mb-2">¿A qué área?</legend>
              {areas.filter(ar => ar.id !== accion.audiencia.area_id).map(ar => (
                <button
                  key={ar.id}
                  type="button"
                  onClick={() => setAreaDestino(ar.id)}
                  aria-pressed={areaDestino === ar.id}
                  className={`tap w-full justify-start! text-left px-4! text-base rounded-xl border transition-colors
                    ${areaDestino === ar.id ? 'bg-accent/20 border-accent text-white' : 'bg-white/5 border-white/10 text-white/80'}`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 shrink-0 ${areaDestino === ar.id ? 'border-accent bg-accent' : 'border-white/40'}`} aria-hidden />
                  {ar.name}
                </button>
              ))}
            </fieldset>
          )}

          <ErrorEnHoja mensaje={errorHoja} />

          <button
            type="button"
            onClick={confirmar}
            disabled={guardando || (accion.tipo === 'derivar' && !areaDestino)}
            className="primary tap w-full text-base disabled:opacity-40"
          >
            {guardando ? 'Guardando…'
              : accion.tipo === 'atender' ? 'Confirmar atención'
              : areaDestino ? `Derivar a ${areas.find(ar => ar.id === areaDestino)?.name || ''}` : 'Elegí un área'}
          </button>
        </HojaInferior>
      )}

      <Aviso aviso={aviso} onCerrar={cerrarAviso} />
    </section>
  );
}
