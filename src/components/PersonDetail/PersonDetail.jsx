import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { calcularEdad, formatFecha, parseFechaLocal } from '../../lib/fechas';
import { escapeHtml, normalizarDni } from '../../lib/texto';

const PersonDetail = ({ personId, onBack, onUsePerson, onViewPerson, profile, backLabel }) => {
  const [person, setPerson] = useState(null);
  const [family, setFamily] = useState([]);
  const [cases, setCases] = useState([]);
  const [timeline, setTimeline] = useState([]);
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
        .from('persons').select('*').eq('id', personId).maybeSingle();
      if (pError || !pData) throw new Error('Persona no encontrada');
      setPerson(pData);

      const { data: fData } = await supabase.from('family_members').select('*').eq('person_id', personId);
      // Vincular familiares que también son personas del sistema (una sola consulta, no una por familiar)
      const dnisFamilia = [...new Set((fData || []).map(m => normalizarDni(m.dni)).filter(Boolean))];
      let idPorDni = {};
      if (dnisFamilia.length > 0) {
        const { data: linked } = await supabase.from('persons').select('id, dni').in('dni', dnisFamilia);
        idPorDni = Object.fromEntries((linked || []).map(p => [p.dni, p.id]));
      }
      const familyWithLinks = (fData || []).map(m => ({ ...m, linkedPersonId: idPorDni[normalizarDni(m.dni)] }));
      setFamily(familyWithLinks);

      const { data: cData } = await supabase
        .from('cases')
        .select('id, person_id, motivo, solucion, estado, actual_date, created_at, area_id, areas!area_id(name)')
        .eq('person_id', personId)
        .order('created_at', { ascending: false });
      setCases(cData || []);

      // Obtener todas las prestaciones
      // Prestaciones de TODOS los casos de la persona (antes solo traía las del último caso)
      const caseIds = (cData || []).map(c => c.id);
      let prestData = [];
      if (caseIds.length > 0) {
        const { data } = await supabase.from('todas_las_prestaciones')
          .select('*').in('case_id', caseIds).order('created_at', { ascending: false });
        prestData = data || [];
      }

      const { data: audData } = await supabase.from('audiencias')
        .select('id, created_at, motivo, estado, prioridad, observaciones_area, area:areas!area_id(name)')
        .eq('person_id', personId).order('created_at', { ascending: false });

      // Combinar todo en un solo timeline
      const combinedTimeline = [
        ...(cData || []).map(c => ({ ...c, type: 'case' })),
        ...(prestData || []).map(p => ({ ...p, type: 'prestacion' })),
        ...(audData || []).map(a => ({ ...a, type: 'audiencia' }))
      ].sort((a, b) => {
        const dateA = a.type === 'case' && a.actual_date ? parseFechaLocal(a.actual_date) : new Date(a.created_at);
        const dateB = b.type === 'case' && b.actual_date ? parseFechaLocal(b.actual_date) : new Date(b.created_at);
        return dateB - dateA;
      });
      setTimeline(combinedTimeline);

      setStatus(`${pData.apellido_nombre} | DNI ${pData.dni}`);
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const edad = calcularEdad(person.fecha_nacimiento);
    const win = window.open('', '_blank');
    if (!win) {
      alert('El navegador bloqueó la ventana de impresión. Habilite las ventanas emergentes para este sitio.');
      return;
    }
    // Todo dato cargado por usuarios se escapa: un nombre con HTML/JS no debe ejecutarse en la impresión
    const e = escapeHtml;
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Ficha — ${e(person.apellido_nombre)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #111; background: #fff; padding: 24px; font-size: 13px; }
    h1 { font-size: 18px; font-weight: bold; color: #0D1B3E; margin-bottom: 2px; }
    h2 { font-size: 13px; font-weight: bold; color: #0D1B3E; margin: 18px 0 6px; padding-bottom: 4px; border-bottom: 1px solid #ccc; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #0D1B3E; }
    .header-left p { font-size: 11px; color: #555; margin-top: 2px; }
    .header-right { text-align: right; font-size: 11px; color: #555; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 11px; }
    th, td { padding: 6px 8px; border: 1px solid #ddd; text-align: left; }
    th { background: #f0f4fa; font-weight: bold; color: #0D1B3E; font-size: 10px; }
    td { font-size: 11px; word-wrap: break-word; }
    .edad-badge { display: inline-block; background: #e8f5e9; border: 1px solid #81c784; border-radius: 4px; padding: 1px 8px; font-weight: bold; color: #2e7d32; font-size: 12px; margin-left: 8px; }
    footer { margin-top: 24px; font-size: 10px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>C.I.C. de Colonia Wanda</h1>
      <p>Provincia de Misiones — Ficha Social</p>
    </div>
    <div class="header-right">
      <p><strong>${e(person.apellido_nombre)}</strong></p>
      <p>DNI: ${e(person.dni)}</p>
      <p>${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
    </div>
  </div>

  <h2>Datos Personales</h2>
  <table>
    <tbody>
      <tr><th>DNI</th><td>${e(person.dni)}</td></tr>
      <tr><th>Apellido y Nombre</th><td>${e(person.apellido_nombre)}</td></tr>
      <tr><th>Fecha de Nacimiento</th><td>
        ${formatFecha(person.fecha_nacimiento, '-')}
        ${edad !== null ? `<span class="edad-badge">${edad} años</span>` : ''}
      </td></tr>
      <tr><th>Domicilio</th><td>${e(person.domicilio)}</td></tr>
      <tr><th>Teléfono</th><td>${e(person.telefono)}</td></tr>
      <tr><th>Estado Civil</th><td>${e(person.estado_civil)}</td></tr>
      <tr><th>Trabaja Actualmente</th><td>${e(person.trabaja_actualmente)}</td></tr>
    </tbody>
  </table>

  <h2>Grupo Familiar (${family.length})</h2>
  ${family.length > 0 ? `<table>
    <thead><tr><th>Nombre</th><th>DNI</th><th>Vínculo</th><th>Observaciones</th></tr></thead>
    <tbody>${family.map(m => `<tr><td>${e(m.apellido_nombres)}</td><td>${e(m.dni)}</td><td>${e(m.vinculo)}</td><td>${e(m.observaciones)}</td></tr>`).join('')}</tbody>
  </table>` : '<p style="color:#888;font-size:12px;">Sin integrantes registrados.</p>'}

  <h2>Historial de Atenciones (${timeline.length})</h2>
  ${timeline.length > 0 ? `<table>
    <thead><tr><th>Tipo</th><th>Descripción</th><th>Detalles / Resumen</th><th>Estado/Área</th><th>Fecha</th></tr></thead>
    <tbody>${timeline.map(item => {
      const typeLabel = item.type === 'case' ? 'Caso Iniciado' : item.type === 'audiencia' ? 'Audiencia' : 'Prestación';
      const dateStr = item.type === 'case' && item.actual_date ? formatFecha(item.actual_date) : new Date(item.created_at).toLocaleDateString('es-AR');
      const stateInfo = item.type === 'audiencia' ? item.estado : (item.area?.name || item.area_name || '—');
      const desc = item.type === 'case' ? item.motivo : item.type === 'audiencia' ? (item.motivo || '—') : item.nombre_prestacion;
      const detalles = item.type === 'case' 
        ? `Motivo: ${item.motivo || '—'} | Solución: ${item.solucion || '—'}` 
        : item.type === 'audiencia' ? (item.observaciones_area || '—') : (item.resumen || '—');
      return `<tr><td style="font-weight:bold;">${typeLabel}</td><td>${e(desc)}</td><td style="font-size:11px;">${e(detalles)}</td><td>${e(stateInfo)}</td><td>${dateStr}</td></tr>`;
    }).join('')}</tbody>
  </table>` : '<p style="color:#888;font-size:12px;">Sin eventos registrados.</p>'}

  <footer>Documento generado automáticamente por el Sistema de Ficha Social — Municipalidad de Colonia Wanda</footer>
</body>
</html>`;

    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  if (loading || !person) return <div className="p-8 text-center text-white">{status}</div>;

  const edad = calcularEdad(person.fecha_nacimiento);
  const datos = [
    ['DNI', person.dni],
    ['Apellido y nombre', person.apellido_nombre],
    ['Fecha de nacimiento', formatFecha(person.fecha_nacimiento)],
    ['Edad', edad !== null ? `${edad} años` : '—'],
    ['Domicilio', person.domicilio || '—', 'domicilio'],
    ['Teléfono', person.telefono || '—', 'telefono'],
    ['Estado civil', person.estado_civil || '—'],
    ['Trabaja actualmente', person.trabaja_actualmente || '—'],
    ['Creado', new Date(person.created_at).toLocaleString('es-AR')],
    ['Actualizado', new Date(person.updated_at).toLocaleString('es-AR')],
  ];

  // En celular, teléfono y domicilio son accionables: llamar o abrir el mapa
  const valorDato = (v, tipo) => {
    if (tipo === 'telefono' && person.telefono) {
      return <a href={`tel:${person.telefono.replace(/[^\d+]/g, '')}`} className="text-accent underline underline-offset-4">{v}</a>;
    }
    if (tipo === 'domicilio' && person.domicilio) {
      const q = encodeURIComponent(`${person.domicilio}, Wanda, Misiones`);
      return <a href={`https://www.google.com/maps/search/?api=1&query=${q}`} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-4">{v}</a>;
    }
    return v;
  };

  const describir = (item) => ({
    tipo: item.type === 'case' ? '📋 Caso' : item.type === 'audiencia' ? '🎤 Audiencia' : '✓ Prestación',
    fecha: item.type === 'case' && item.actual_date
      ? formatFecha(item.actual_date)
      : new Date(item.created_at).toLocaleDateString('es-AR'),
    estado: item.type === 'audiencia' ? item.estado : (item.areas?.name || item.area?.name || item.area_name || '—'),
    descripcion: item.type === 'case'
      ? item.motivo
      : item.type === 'audiencia' ? `Audiencia: ${item.motivo || '—'}` : item.nombre_prestacion,
    detalle: item.type === 'case'
      ? `Solución: ${item.solucion || '—'}`
      : item.type === 'audiencia' ? (item.observaciones_area || '') : (item.resumen || ''),
  });

  return (
    <div className="flex flex-col h-full space-y-4 md:space-y-6 pb-8">

      {/* Encabezado y acciones */}
      <section className="card p-4! md:p-6!">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-white break-words">{person.apellido_nombre}</h2>
            <p className="text-sm text-muted mt-1">
              DNI {person.dni}{edad !== null ? ` · ${edad} años` : ''}
            </p>
          </div>
          <div className="grid grid-cols-2 md:flex gap-2 md:shrink-0">
            {canUsePerson && onUsePerson && (
              <button onClick={() => onUsePerson(person)} className="primary tap col-span-2 text-sm">
                Usar esta persona
              </button>
            )}
            <button onClick={handlePrint} className="secondary tap text-sm">
              🖨️ Imprimir
            </button>
            <button onClick={onBack} className="secondary tap text-sm">
              ← {backLabel || 'Volver'}
            </button>
          </div>
        </div>
      </section>

      {/* Datos personales */}
      <section className="card p-4! md:p-6!">
        <h3 className="text-base font-bold text-white mb-3">Datos personales</h3>

        {/* Celular: etiqueta arriba, valor abajo (nada se corta) */}
        <dl className="md:hidden divide-y divide-white/5">
          {datos.map(([k, v, tipo]) => (
            <div key={k} className="py-2.5">
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="text-base text-white font-medium break-words">{valorDato(v, tipo)}</dd>
            </div>
          ))}
        </dl>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm bg-black/40">
            <tbody className="divide-y divide-white/5">
              {datos.map(([k, v, tipo]) => (
                <tr key={k} className="hover:bg-white/2 transition-colors">
                  <th className="text-left px-4 py-3 w-1/3 text-xs font-bold text-muted uppercase tracking-wider bg-white/2">{k}</th>
                  <td className="px-4 py-3 text-white font-semibold">{valorDato(v, tipo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Grupo familiar */}
      {family.length > 0 && (
        <section className="card p-4! md:p-6!">
          <h3 className="text-base font-bold text-white mb-3">Grupo familiar ({family.length})</h3>

          <ul className="md:hidden space-y-2">
            {family.map((m, i) => (
              <li key={m.id || i} className="rounded-xl border border-white/10 bg-white/3 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white font-semibold break-words">{m.apellido_nombres || '—'}</p>
                    <p className="text-sm text-muted">
                      {[m.vinculo, m.dni ? `DNI ${m.dni}` : null].filter(Boolean).join(' · ') || '—'}
                    </p>
                    {m.observaciones && <p className="text-sm text-white/70 mt-1">{m.observaciones}</p>}
                  </div>
                  {m.linkedPersonId && onViewPerson && (
                    <button onClick={() => onViewPerson(m.linkedPersonId)} className="secondary tap px-3! text-sm shrink-0">
                      Ver ficha
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-black/40">
                  <th className="text-left px-4 py-3">Nombre</th>
                  <th className="text-left px-4 py-3">DNI</th>
                  <th className="text-left px-4 py-3">Vínculo</th>
                  <th className="text-left px-4 py-3">Observaciones</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {family.map((m, i) => (
                  <tr key={m.id || i} className="hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white">{m.apellido_nombres || '—'}</td>
                    <td className="px-4 py-3 font-mono text-white/60">{m.dni || '—'}</td>
                    <td className="px-4 py-3 text-white/70">{m.vinculo || '—'}</td>
                    <td className="px-4 py-3 text-white/60 max-w-xs">{m.observaciones || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {m.linkedPersonId && onViewPerson && (
                        <button onClick={() => onViewPerson(m.linkedPersonId)} className="secondary py-1.5! px-3! text-xs">
                          Ver ficha
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Historial */}
      <section className="card p-4! md:p-6!">
        <h3 className="text-base font-bold text-white mb-3">Historial ({timeline.length})</h3>
        {timeline.length === 0 ? (
          <p className="text-center text-muted py-8">Sin eventos registrados</p>
        ) : (
          <>
            {/* Celular: línea de tiempo en tarjetas */}
            <ol className="md:hidden space-y-2">
              {timeline.map((item, i) => {
                const d = describir(item);
                return (
                  <li key={`${item.type}-${item.id || i}`} className="rounded-xl border border-white/10 bg-white/3 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white">{d.tipo}</span>
                      <span className="text-xs text-muted font-mono">{d.fecha}</span>
                    </div>
                    {d.descripcion && <p className="text-sm text-white/85 mt-1 break-words">{d.descripcion}</p>}
                    {d.detalle && <p className="text-sm text-white/60 mt-1 break-words">{d.detalle}</p>}
                    {d.estado && d.estado !== '—' && <p className="text-xs text-muted mt-1">{d.estado}</p>}
                  </li>
                );
              })}
            </ol>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-black/40">
                    <th className="text-left px-4 py-3">Tipo</th>
                    <th className="text-left px-4 py-3">Descripción</th>
                    <th className="text-left px-4 py-3">Detalle</th>
                    <th className="text-left px-4 py-3">Estado / Área</th>
                    <th className="text-left px-4 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {timeline.map((item, i) => {
                    const d = describir(item);
                    return (
                      <tr key={`${item.type}-${item.id || i}`} className="hover:bg-white/2 transition-colors">
                        <td className="px-4 py-3 font-bold text-white whitespace-nowrap">{d.tipo}</td>
                        <td className="px-4 py-3 text-white/70 text-sm max-w-xs">{d.descripcion}</td>
                        <td className="px-4 py-3 text-white/60 text-sm max-w-sm">{d.detalle || '—'}</td>
                        <td className="px-4 py-3 text-white/60 text-sm whitespace-nowrap">{d.estado}</td>
                        <td className="px-4 py-3 text-white/60 font-mono text-sm whitespace-nowrap">{d.fecha}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default PersonDetail;