import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const PersonDetail = ({ personId, onBack, onUsePerson, onViewPerson, profile, backLabel }) => {
  const [person, setPerson] = useState(null);
  const [family, setFamily] = useState([]);
  const [cases, setCases] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Cargando ficha...');

  const isIntendencia = profile?.areas?.name?.trim().toLowerCase() === 'intendencia';
  const canUsePerson = !isIntendencia;

  useEffect(() => {
    if (personId) fetchDetail();
  }, [personId]);

  const fetchDetail = async () => {
    setLoading(true);
    setStatus('Cargando ficha...');
    try {
      const { data: pData, error: pError } = await supabase
        .from('persons')
        .select('*')
        .eq('id', personId)
        .maybeSingle();

      if (pError || !pData) throw new Error('Persona no encontrada');
      setPerson(pData);

      const { data: fData } = await supabase
        .from('family_members')
        .select('*')
        .eq('person_id', personId);

      const familyWithLinks = await Promise.all((fData || []).map(async (m) => {
        const dniNorm = String(m.dni || '').replace(/\D/g, '');
        if (!dniNorm) return m;
        const { data: linked } = await supabase.from('persons').select('id').eq('dni', dniNorm).maybeSingle();
        return { ...m, linkedPersonId: linked?.id };
      }));
      setFamily(familyWithLinks);

      const { data: cData } = await supabase
        .from('cases_readable')
        .select('*')
        .eq('person_id', personId)
        .order('created_at', { ascending: false });
      setCases(cData || []);

      const { data: prestData } = await supabase
        .from('case_prestaciones_readable')
        .select('id, created_at, prestacion_nombre, area_name, resumen')
        .eq('person_id', personId);

      const { data: audData } = await supabase
        .from('audiencias')
        .select('id, created_at, motivo, estado, prioridad, observaciones_area, area:areas!area_id(name)')
        .eq('person_id', personId)
        .order('created_at', { ascending: false });

      const combinedTimeline = [
        ...(cData || []).map(c => ({ ...c, type: 'case' })),
        ...(prestData || []).map(p => ({ ...p, type: 'prestacion' })),
        ...(audData || []).map(a => ({ ...a, type: 'audiencia' }))
      ].sort((a, b) => {
        // Para casos usar actual_date si existe, si no created_at
        const dateA = a.type === 'case' && a.actual_date ? new Date(a.actual_date) : new Date(a.created_at);
        const dateB = b.type === 'case' && b.actual_date ? new Date(b.actual_date) : new Date(b.created_at);
        return dateB - dateA;
      });

      setTimeline(combinedTimeline);

      const { data: alertData, error: alertError } = await supabase
        .rpc('get_social_alerts', { p_person_id: personId });
      if (!alertError) setAlerts(alertData || []);

      setStatus(`${pData.apellido_nombre} | DNI ${pData.dni}`);
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatTimelineDate = (item) => {
    if (item.type === 'case' && item.actual_date) {
      return new Date(item.actual_date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    return new Date(item.created_at).toLocaleString('es-AR');
  };

  if (!person && loading) return <div className="card"><p className="loading">Cargando...</p></div>;
  if (!person) return (
    <div className="card">
      <p className="muted">{status}</p>
      <button onClick={onBack} className="secondary mt-4">Volver</button>
    </div>
  );

  return (
    <section id="screenPersonDetail" className="screen active flex flex-col gap-6">
      <section className="card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold">Detalle de Persona</h2>
            <p className="muted">{status}</p>
          </div>
          <div className="flex gap-2">
            {canUsePerson && onUsePerson && (
              <button className="primary" onClick={() => onUsePerson(person)}>
                Usar esta persona
              </button>
            )}
            <button className="secondary" onClick={onBack}>
              {backLabel || 'Volver al Dashboard'}
            </button>
          </div>
        </div>

        <h3 className="text-base font-bold mt-6 mb-2">Ficha completa</h3>
        <div className="tableWrap">
          <table>
            <tbody>
              {[
                ['DNI', person.dni],
                ['Apellido y nombre', person.apellido_nombre],
                ['Fecha nacimiento', person.fecha_nacimiento],
                ['Domicilio', person.domicilio],
                ['Teléfono', person.telefono],
                ['Estado civil', person.estado_civil],
                ['Trabaja actualmente', person.trabaja_actualmente],
                ['Creado', new Date(person.created_at).toLocaleString('es-AR')],
                ['Actualizado', new Date(person.updated_at).toLocaleString('es-AR')]
              ].map(([k, v]) => (
                <tr key={k}>
                  <th className="w-1/3 text-left font-semibold text-(--muted)">{k}</th>
                  <td>{v || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="text-base font-bold mt-8 mb-2">Grupo familiar</h3>
        <div className="tableWrap">
          <table>
            <thead>
              <tr><th>Nombre</th><th>DNI</th><th>Vínculo</th><th>Observaciones</th><th>Acción</th></tr>
            </thead>
            <tbody>
              {family.length > 0 ? family.map(m => (
                <tr key={m.id}>
                  <td>{m.apellido_nombres}</td>
                  <td>{m.dni || 'Sin DNI'}</td>
                  <td>{m.vinculo || '-'}</td>
                  <td>{m.observaciones || '-'}</td>
                  <td>
                    {m.linkedPersonId && (
                      <button className="secondary text-xs p-1" onClick={() => onViewPerson && onViewPerson(m.linkedPersonId)}>
                        Ver ficha
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="4" className="muted text-center">Sin integrantes.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ALERTAS SOCIALES */}
        <h3 className="text-base font-bold mt-8 mb-2">Alertas sociales</h3>
        <div className="alertsList grid gap-2">
          {alerts.map((a, idx) => (
            <div key={a.id ?? idx} className={`alertItem rounded-xl p-4 border flex items-start gap-3 ${
              a.tipo === 'critical'
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-yellow-500/10 border-yellow-500/30'
            }`}>
              <span className="text-base mt-0.5">{a.tipo === 'critical' ? '🔴' : '⚠️'}</span>
              <div className="flex-1 min-w-0">
                <p className="alertMessage text-sm font-bold text-white">{a.mensaje}</p>
                {a.fecha && (
                  <p className="text-[10px] text-white/50 mt-1 font-mono uppercase tracking-widest">
                    {a.fecha}
                  </p>
                )}
              </div>
            </div>
          ))}
          {alerts.length === 0 && <p className="muted">Sin alertas relevantes.</p>}
        </div>

        {/* TIMELINE — usa actual_date para casos */}
        <h3 className="text-base font-bold mt-8 mb-2">Timeline social</h3>
        <div className="timelineList">
          {timeline.map((item, idx) => (
            <div key={`${item.type}-${item.id}-${idx}`} className="timelineItem border border-(--border) bg-(--panel) rounded-xl p-3 relative pl-4">
              <div className="timelineHead flex justify-between gap-2 flex-wrap mb-1">
                <span className="timelineTitle font-bold text-sm">
                  {item.type === 'case' ? 'Atención Iniciada' :
                   item.type === 'audiencia' ? 'Audiencia' :
                   (item.prestacion_nombre || 'Prestación')}
                </span>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="timelineMeta text-xs text-(--muted)">
                    {formatTimelineDate(item)}
                  </span>
                  {/* Indicador de carga tardía */}
                  {item.type === 'case' && item.actual_date &&
                    new Date(item.actual_date).toDateString() !== new Date(item.created_at).toDateString() && (
                    <span className="text-[9px] text-white/25 font-mono italic">
                      cargado {new Date(item.created_at).toLocaleDateString('es-AR')}
                    </span>
                  )}
                </div>
              </div>
              <div className="timelineSub text-[0.86rem] text-[#d3e0e9]">
                <span className={`pill text-[10px] py-0 px-2 mr-2 ${
                  item.type === 'case' ? 'bg-blue-500/10' :
                  item.type === 'audiencia' ? 'bg-orange-500/10 text-orange-400' : ''
                }`}>
                  {item.type === 'audiencia' ? (item.area?.name || 'Audiencia') : (item.area_name || 'Área')}
                </span>
                {item.type === 'audiencia' ? (
                  <span>
                    {item.motivo}
                    {item.estado && (
                      <span className={'ml-2 text-[10px] font-black uppercase opacity-50'}>{item.estado}</span>
                    )}
                    {item.observaciones_area && (
                      <span className={'block text-[11px] mt-1 opacity-60'}>{item.observaciones_area}</span>
                    )}
                  </span>
                ) : (item.motivo || item.resumen)}
              </div>
            </div>
          ))}
          {timeline.length === 0 && <p className="muted">Sin eventos registrados.</p>}
        </div>
      </section>
    </section>
  );
};

export default PersonDetail;