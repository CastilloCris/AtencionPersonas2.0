import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAudiencias, actualizarAudiencia, fotoAudiencia, ordenarPorPrioridad, PRIORIDAD } from '../lib/audiencias';
import {
  CabeceraAudiencia, Motivo, SelectorPrioridad, HojaInferior, Aviso,
  EncabezadoBandeja, BandejaVacia, ErrorConexion, ErrorEnHoja,
} from './Bandeja/BandejaUI';

const RESPUESTAS = {
  atendido:    { estado: 'ATENDIDO',    boton: '✓ Se atiende',    titulo: 'Se atiende',          ok: 'Marcada como "se atiende"',    cls: 'bg-teal-500/15 border-teal-500/30 text-teal-300' },
  no_atendido: { estado: 'NO_ATENDIDO', boton: '✗ No se atiende', titulo: 'No se atiende',       ok: 'Marcada como "no se atiende"', cls: 'bg-red-500/10 border-red-500/30 text-red-300' },
  derivado:    { estado: 'DERIVADO',    boton: '→ Derivar',       titulo: 'Derivar a otra área', ok: 'Derivada',                     cls: 'bg-amber-500/10 border-amber-500/30 text-amber-300' },
};

export default function DashboardIntendencia({ profile, onViewPerson }) {
  const { audiencias, setAudiencias, loading, error, recargar } = useAudiencias({
    estado: 'PENDIENTE',
    habilitado: !!profile,
    canal: 'audiencias-intendencia',
  });
  const [areas, setAreas] = useState([]);
  const [respondiendo, setRespondiendo] = useState(null); // { audiencia, tipo }
  const [texto, setTexto] = useState('');
  const [areaDestino, setAreaDestino] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorHoja, setErrorHoja] = useState('');
  const [aviso, setAviso] = useState(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);

  useEffect(() => {
    supabase.from('areas').select('id, name').eq('active', true).order('name')
      .then(({ data }) => setAreas((data || []).filter(ar => {
        const n = ar.name?.trim().toLowerCase();
        return n !== 'mesa de entrada' && n !== 'intendencia';
      })));
  }, []);

  const abrir = (audiencia, tipo) => {
    setRespondiendo({ audiencia, tipo });
    setTexto('');
    setAreaDestino('');
    setErrorHoja('');
  };
  const cerrar = useCallback(() => { if (!guardando) setRespondiendo(null); }, [guardando]);

  const confirmar = async () => {
    const { audiencia, tipo } = respondiendo;
    if (tipo === 'derivado' && !areaDestino) return;
    const antes = fotoAudiencia(audiencia);
    const cambios = {
      estado: RESPUESTAS[tipo].estado,
      tipo_respuesta: tipo,
      respuesta: texto.trim() || null,
      respondido_at: new Date().toISOString(),
      respondido_por: profile?.user_id ?? null,
      ...(tipo === 'derivado' ? { area_id: areaDestino } : {}),
    };

    setGuardando(true);
    const { error: err } = await actualizarAudiencia(audiencia.id, cambios);
    setGuardando(false);

    if (err) {
      // La tarjeta NO se quita (antes desaparecía aunque no se hubiera guardado).
      // El error se muestra dentro de la hoja, junto al botón para reintentar.
      setErrorHoja(err.message);
      return;
    }

    setAudiencias(prev => prev.filter(x => x.id !== audiencia.id));
    setRespondiendo(null);
    const nombreArea = tipo === 'derivado' ? areas.find(ar => ar.id === areaDestino)?.name : null;
    setAviso({
      mensaje: `${RESPUESTAS[tipo].ok}${nombreArea ? ` a ${nombreArea}` : ''}: ${audiencia.persona?.apellido_nombre || ''}`,
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

  const urgentes = audiencias.filter(a => a.prioridad === 'urgente').length;
  const r = respondiendo && RESPUESTAS[respondiendo.tipo];

  return (
    <section className="space-y-4 md:space-y-6 fade-in pb-24">
      <EncabezadoBandeja
        titulo="Personas para atención"
        subtitulo="Audiencias pendientes"
        total={audiencias.length}
        urgentes={urgentes}
        loading={loading}
        onActualizar={() => recargar()}
      />

      <ErrorConexion mensaje={error} onReintentar={() => recargar()} />

      {loading && audiencias.length === 0 ? (
        <div className="text-center py-16 text-muted text-sm">Cargando audiencias…</div>
      ) : audiencias.length === 0 ? (
        <BandejaVacia titulo="Sin audiencias pendientes" detalle="La bandeja está al día" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {audiencias.map(a => {
            const prio = PRIORIDAD[a.prioridad] || PRIORIDAD.normal;
            const personaId = a.persona?.id || a.person_id;
            return (
              <article key={a.id} className={`card p-4! md:p-5! border-l-4 space-y-3 ${prio.borde} ${prio.card}`}>
                <CabeceraAudiencia a={a} etiquetaArea={a.area?.name || 'Sin área'} />
                <Motivo texto={a.motivo} />

                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <SelectorPrioridad value={a.prioridad} onChange={v => cambiarPrioridad(a, v)} />
                  <button
                    type="button"
                    className="secondary tap px-4! text-sm"
                    onClick={() => onViewPerson?.(personaId, 'screenDashboardIntendencia')}
                    disabled={!personaId}
                  >
                    Ver ficha
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(RESPUESTAS).map(([tipo, cfg]) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => abrir(a, tipo)}
                      className={`tap px-2! py-2! text-sm font-semibold leading-tight rounded-xl border ${cfg.cls}`}
                    >
                      {cfg.boton}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {respondiendo && (
        <HojaInferior
          titulo={r.titulo}
          subtitulo={`${respondiendo.audiencia.persona?.apellido_nombre || ''} · DNI ${respondiendo.audiencia.persona?.dni || '—'}`}
          onClose={cerrar}
        >
          {respondiendo.tipo === 'derivado' && (
            <fieldset className="space-y-2">
              <legend className="text-sm text-muted mb-2">¿A qué área?</legend>
              {areas.length === 0 && <p className="text-sm text-muted">Cargando áreas…</p>}
              {areas.map(ar => (
                <button
                  key={ar.id}
                  type="button"
                  onClick={() => setAreaDestino(ar.id)}
                  aria-pressed={areaDestino === ar.id}
                  className={`tap w-full justify-start! text-left px-4! text-base rounded-xl border transition-colors
                    ${areaDestino === ar.id
                      ? 'bg-accent/20 border-accent text-white'
                      : 'bg-white/5 border-white/10 text-white/80'}`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 shrink-0 ${areaDestino === ar.id ? 'border-accent bg-accent' : 'border-white/40'}`} aria-hidden />
                  {ar.name}
                </button>
              ))}
            </fieldset>
          )}

          <div>
            <label htmlFor="respuesta-intendencia">Observación para Mesa de Entrada (opcional)</label>
            <textarea
              id="respuesta-intendencia"
              rows={3}
              value={texto}
              onChange={e => setTexto(e.target.value)}
              placeholder="Detalle de la respuesta…"
              className="resize-none"
            />
          </div>

          <ErrorEnHoja mensaje={errorHoja} />

          <button
            type="button"
            onClick={confirmar}
            disabled={guardando || (respondiendo.tipo === 'derivado' && !areaDestino)}
            className="primary tap w-full text-base disabled:opacity-40"
          >
            {guardando ? 'Guardando…'
              : respondiendo.tipo === 'derivado'
                ? (areaDestino ? `Derivar a ${areas.find(ar => ar.id === areaDestino)?.name || ''}` : 'Elegí un área')
                : respondiendo.tipo === 'atendido' ? 'Confirmar: se atiende' : 'Confirmar: no se atiende'}
          </button>
        </HojaInferior>
      )}

      <Aviso aviso={aviso} onCerrar={cerrarAviso} />
    </section>
  );
}
