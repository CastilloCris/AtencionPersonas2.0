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

  const calcularEdad = (fechaNac) => {
    if (!fechaNac) return null;
    const hoy = new Date();
    const nac = new Date(fechaNac);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad >= 0 ? edad : null;
  };

  const handlePrint = () => {
    const edad = calcularEdad(person.fecha_nacimiento);
    const win = window.open('', '_blank');
    const tipoConfig = { critical: '🔴', warning: '⚠️' };

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Ficha — ${person.apellido_nombre}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #111; background: #fff; padding: 24px; font-size: 13px; }
    h1 { font-size: 18px; font-weight: bold; color: #0D1B3E; margin-bottom: 2px; }
    h2 { font-size: 13px; font-weight: bold; color: #0D1B3E; margin: 18px 0 6px; padding-bottom: 4px; border-bottom: 1px solid #ccc; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #0D1B3E; }
    .header-left p { font-size: 11px; color: #555; margin-top: 2px; }
    .header-right { text-align: right; font-size: 11px; color: #555; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th, td { padding: 5px 8px; border: 1px solid #ddd; text-align: left; font-size: 12px; }
    th { background: #f0f4fa; font-weight: bold; color: #0D1B3E; width: 30%; }
    .edad-badge { display: inline-block; background: #e8f5e9; border: 1px solid #81c784; border-radius: 4px; padding: 1px 8px; font-weight: bold; color: #2e7d32; font-size: 12px; margin-left: 8px; }
    .alert { padding: 6px 10px; border-radius: 4px; margin-bottom: 6px; font-size: 12px; }
    .alert.critical { background: #fff0f0; border: 1px solid #f5a5a5; }
    .alert.warning { background: #fffde7; border: 1px solid #ffe082; }
    .timeline-item { border: 1px solid #ddd; border-radius: 4px; padding: 7px 10px; margin-bottom: 6px; font-size: 12px; }
    .timeline-title { font-weight: bold; color: #0D1B3E; }
    .timeline-meta { font-size: 11px; color: #777; margin-top: 2px; }
    .pill { display: inline-block; background: #e8edf5; border-radius: 3px; padding: 1px 7px; font-size: 11px; color: #0D1B3E; margin-right: 6px; }
    footer { margin-top: 24px; font-size: 10px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 8px; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>C.I.C. de Colonia Wanda</h1>
      <p>Provincia de Misiones — Ficha Social</p>
    </div>
    <div class="header-right">
      <p><strong>${person.apellido_nombre}</strong></p>
      <p>DNI: ${person.dni || '-'}</p>
      <p>${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
    </div>
  </div>

  <h2>Datos Personales</h2>
  <table>
    <tbody>
      <tr><th>DNI</th><td>${person.dni || '-'}</td></tr>
      <tr><th>Apellido y Nombre</th><td>${person.apellido_nombre || '-'}</td></tr>
      <tr><th>Fecha de Nacimiento</th><td>
        ${person.fecha_nacimiento ? new Date(person.fecha_nacimiento).toLocaleDateString('es-AR') : '-'}
        ${edad !== null ? `<span class="edad-badge">${edad} años</span>` : ''}
      </td></tr>
      <tr><th>Domicilio</th><td>${person.domicilio || '-'}</td></tr>
      <tr><th>Teléfono</th><td>${person.telefono || '-'}</td></tr>
      <tr><th>Estado Civil</th><td>${person.estado_civil || '-'}</td></tr>
      <tr><th>Trabaja Actualmente</th><td>${person.trabaja_actualmente || '-'}</td></tr>
    </tbody>
  </table>

  <h2>Grupo Familiar (${family.length} integrante${family.length !== 1 ? 's' : ''})</h2>
  ${family.length > 0 ? `
  <table>
    <thead><tr><th>Nombre</th><th>DNI</th><th>Vínculo</th><th>Observaciones</th></tr></thead>
    <tbody>
      ${family.map(m => `
        <tr>
          <td>${m.apellido_nombres || '-'}</td>
          <td>${m.dni || '-'}</td>
          <td>${m.vinculo || '-'}</td>
          <td>${m.observaciones || '-'}</td>
        </tr>`).join('')}
    </tbody>
  </table>` : '<p style="color:#888;font-size:12px;">Sin integrantes registrados.</p>'}

  <h2>Alertas Sociales</h2>
  ${alerts.length > 0 ? alerts.map(a => `
    <div class="alert ${a.tipo === 'critical' ? 'critical' : 'warning'}">
      <strong>${a.tipo === 'critical' ? '🔴' : '⚠️'} ${a.mensaje}</strong>
      ${a.fecha ? `<br><span style="font-size:11px;color:#777;">${a.fecha}</span>` : ''}
    </div>`).join('') : '<p style="color:#888;font-size:12px;">Sin alertas registradas.</p>'}

  <h2>Timeline Social (${timeline.length} evento${timeline.length !== 1 ? 's' : ''})</h2>
  ${timeline.length > 0 ? timeline.map(item => `
    <div class="timeline-item">
      <div class="timeline-title">
        ${item.type === 'case' ? 'Atención Iniciada' : item.type === 'audiencia' ? 'Audiencia' : (item.prestacion_nombre || 'Prestación')}
      </div>
      <div class="timeline-meta">
        <span class="pill">${item.area_name || item.area?.name || 'Sin área'}</span>
        ${item.motivo || item.resumen || ''}
        — ${item.type === 'case' && item.actual_date ? new Date(item.actual_date).toLocaleDateString('es-AR') : new Date(item.created_at).toLocaleString('es-AR')}
      </div>
    </div>`).join('') : '<p style="color:#888;font-size:12px;">Sin eventos registrados.</p>'}

  <footer>Documento generado automáticamente por el Sistema de Ficha Social — Municipalidad de Colonia Wanda</footer>
</body>
</html>`;

    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
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
            <button className="secondary" onClick={handlePrint}>
              🖨️ Imprimir ficha
            </button>
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
                ['Fecha nacimiento', person.fecha_nacimiento
                  ? <span>{new Date(person.fecha_nacimiento).toLocaleDateString('es-AR')}{calcularEdad(person.fecha_nacimiento) !== null && <span className="ml-2 inline-flex items-center gap-1 bg-accent/10 border border-accent/20 rounded-lg px-2 py-0.5 text-[11px] font-black text-accent">{calcularEdad(person.fecha_nacimiento)} años</span>}</span>
                  : '-'],
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