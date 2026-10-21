import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { guardarPersona } from '../../lib/persons';
import { hoyLocal, parseFechaLocal, calcularEdad } from '../../lib/fechas';
import { escapeHtml, normalizarDni, dniConPuntos } from '../../lib/texto';

const NewCaseForm = ({ profile, areas, currentPerson, setCurrentPerson, lastCaseId, setLastCaseId, onViewPerson }) => {
  const dniRef = useRef(null);

  const [formData, setFormData] = useState({
    dni: '',
    apellidoNombre: '',
    fechaNac: '',
    telefono: '',
    domicilio: '',
    estadoCivil: '',
    trabaja: '',
    ingresos: '',
    motivo: '',
    solucion: '',
    areaId: ''
  });

  const [status, setStatus] = useState({ person: '', case: '' });
  const [loading, setLoading] = useState(false);
  const [socialAlerts, setSocialAlerts] = useState([]);
  const [actualDate, setActualDate] = useState(hoyLocal());
  const [showModal, setShowModal] = useState(false);
  const [printSnapshot, setPrintSnapshot] = useState(null);

  useEffect(() => {
    if (currentPerson) {
      setFormData(prev => ({
        ...prev,
        dni: currentPerson.dni || '',
        apellidoNombre: currentPerson.apellido_nombre || '',
        fechaNac: currentPerson.fecha_nacimiento || '',
        telefono: currentPerson.telefono || '',
        domicilio: currentPerson.domicilio || '',
        estadoCivil: currentPerson.estado_civil || '',
        trabaja: currentPerson.trabaja_actualmente || '',
      }));
    }
  }, [currentPerson]);

  useEffect(() => {
    if (profile) {
      // Si es superadmin puede elegir área, si no usa su área por defecto
      const defaultAreaId = profile.role === 'superadmin' ? '' : (profile.default_area_id || '');
      setFormData(prev => ({ ...prev, areaId: String(defaultAreaId) }));
    }
  }, [profile]);

  const normalizeDni = normalizarDni;

  const resetForm = () => {
    setFormData(prev => ({
      ...prev,
      ingresos: '',
      motivo: '',
      solucion: '',
      areaId: profile?.role === 'superadmin' ? '' : (profile?.default_area_id ? String(profile.default_area_id) : '')
    }));
    setActualDate(hoyLocal());
    // No limpiamos a la persona ni sus datos personales, para que pueda cargar el Grupo Familiar.
    setSocialAlerts([]);
    
    setTimeout(() => {
      if (dniRef.current) {
        dniRef.current.focus();
      }
    }, 100);
  };

  const clearForm = () => {
    setFormData({
      dni: '',
      apellidoNombre: '',
      fechaNac: '',
      telefono: '',
      domicilio: '',
      estadoCivil: '',
      trabaja: '',
      ingresos: '',
      motivo: '',
      solucion: '',
      areaId: profile?.role === 'superadmin' ? '' : (profile?.default_area_id ? String(profile.default_area_id) : '')
    });
    setActualDate(hoyLocal());
    setCurrentPerson(null);
    setLastCaseId(null);
    setPrintSnapshot(null);
    setSocialAlerts([]);
    setShowModal(false);
    setStatus({ person: '', case: '' });

    setTimeout(() => {
      if (dniRef.current) {
        dniRef.current.focus();
      }
    }, 100);
  };

  const fetchSocialAlerts = async (personId) => {
    try {
      const { data, error } = await supabase.rpc('get_social_alerts', { p_person_id: personId });
      if (error) throw error;
      if (data && data.length > 0) {
        const now = new Date();
        const currentMonth = now.getMonth(); // 0-11
        const currentYear = now.getFullYear();

        const filtered = data.filter(alerta => {
          const d = parseFechaLocal(alerta.fecha);
          return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        if (filtered.length > 0) {
          setSocialAlerts(filtered);
          setShowModal(true);
        }
      }
    } catch (e) {
      console.error("Error al buscar alertas sociales:", e);
    }
  };

  const findPerson = async () => {
    const dniNorm = normalizeDni(formData.dni);
    if (!dniNorm || dniNorm.length < 7) return;

    setStatus(prev => ({ ...prev, person: 'Buscando...' }));
    
    let { data: person } = await supabase.from('persons').select('*').eq('dni', dniNorm).maybeSingle();

    if (!person) {
      // Búsqueda EXACTA: antes usaba ilike %dni% y el DNI 1234567 coincidía con 21234567.
      const { data: lastCase } = await supabase.from('cases').select('*').in('dni', [dniNorm, dniConPuntos(dniNorm)]).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (lastCase) {
        const { data: newP } = await supabase.from('persons').insert({
          dni: normalizeDni(lastCase.dni),
          apellido_nombre: lastCase.apellido_nombre,
          fecha_nacimiento: lastCase.fecha_nacimiento,
          domicilio: lastCase.domicilio,
          telefono: lastCase.telefono
        }).select('*').maybeSingle();
        person = newP;
      }
    }

    if (person) {
      setCurrentPerson(person);
      setStatus({ person: `Encontrado: ${person.apellido_nombre}`, case: '' });
      fetchSocialAlerts(person.id); // ACTIVADOR DE ALERTAS
    } else {
      setCurrentPerson(null);
      setStatus({ person: 'No encontrado. Complete para crear.', case: '' });
    }
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    if (id === 'dni' && currentPerson && normalizeDni(value) !== currentPerson.dni) {
      // Cambió el DNI: se descartan los datos de la persona anterior para no guardarlos con otro DNI.
      setCurrentPerson(null);
      setFormData(prev => ({
        ...prev,
        dni: value,
        apellidoNombre: '',
        fechaNac: '',
        telefono: '',
        domicilio: '',
        estadoCivil: '',
        trabaja: '',
      }));
      setStatus({ person: '', case: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(prev => ({ ...prev, case: 'Procesando...' }));

    try {
      const dniNorm = normalizeDni(formData.dni);
      if (dniNorm.length < 7) throw new Error('El DNI debe tener al menos 7 dígitos.');
      
      // 1) Guardar persona sin pisar datos existentes con campos vacíos
      const { data: person, error: pError } = await guardarPersona({
        dni: dniNorm,
        apellido_nombre: formData.apellidoNombre,
        fecha_nacimiento: formData.fechaNac,
        domicilio: formData.domicilio,
        telefono: formData.telefono,
        estado_civil: formData.estadoCivil,
        trabaja_actualmente: formData.trabaja,
      });

      if (pError) throw pError;

      const personId = person?.id; 
      if (!personId) throw new Error("No se pudo obtener el ID de la persona");

      // 2) Validación de Seguridad: Área y Usuario Creador
      const finalAreaId = formData.areaId || null;
      const creatorId = profile?.user_id || null;

      if (!finalAreaId || !creatorId) {
        setStatus(prev => ({ ...prev, case: 'Error: No se pudo identificar el área o el usuario.' }));
        alert('Error: No se pudo identificar el área o el usuario. Por favor, reinicie sesión.');
        return;
      }

      // 3) Insertar el Caso vinculado al personId
      const { data: newCase, error: caseErr } = await supabase
        .from('cases')
        .insert({
          person_id: personId,
          area_id: finalAreaId,
          created_by: creatorId,
          dni: person.dni,
          apellido_nombre: person.apellido_nombre,
          ingresos: parseFloat(formData.ingresos) || 0,
          motivo: formData.motivo,
          solucion: formData.solucion || null,
          actual_date: actualDate,
        })
        .select('id')
        .single();

      if (caseErr) throw caseErr;
      const caseId = newCase.id;

      // 3) Insertar Prestación (opcional, si existe en el estado)
      if (formData.prestacionId) {
        // Obtener el nombre de la prestación del catálogo
        const { data: prestCatalog } = await supabase
          .from('prestaciones_catalog')
          .select('nombre')
          .eq('id', formData.prestacionId)
          .single();

        const { error: prestErr } = await supabase
          .from('case_prestaciones')
          .insert({
            case_id: caseId,
            person_id: personId,
            prestacion_id: formData.prestacionId,
            nombre_prestacion: prestCatalog?.nombre || null,
            observaciones: 'Carga inicial desde formulario de caso'
          });
        
        if (prestErr) console.error("Error al insertar prestación inicial:", prestErr);
      }

      // Finalización exitosa
      setLastCaseId(caseId);
      setPrintSnapshot({
        caseId,
        person,
        actualDate,
        formData: {
          ...formData,
          areaId: finalAreaId,
          dni: person.dni,
          apellidoNombre: person.apellido_nombre
        }
      });
      setCurrentPerson(person); // Aseguramos que la persona esté activa para el Grupo Familiar
      setStatus({ person: 'Operación exitosa', case: 'Persona y Caso guardados correctamente.' });

      resetForm();

    } catch (error) {
      console.error("Error en el proceso de guardado:", error);
      setStatus(prev => ({ ...prev, case: `Error: ${error.message}` }));
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    const printableCaseId = lastCaseId || printSnapshot?.caseId;
    const printablePerson = currentPerson || printSnapshot?.person;

    if (!printableCaseId || !printablePerson) {
      setStatus(prev => ({ ...prev, case: 'Primero registre un caso para poder imprimir la ficha.' }));
      return;
    }

    const win = window.open('', '_blank');
    if (!win) {
      alert('El navegador bloqueó la ventana de impresión. Habilite las ventanas emergentes para este sitio.');
      return;
    }

    win.document.write(`
      <!doctype html>
      <html>
        <head><meta charset="utf-8" /><title>Preparando ficha</title></head>
        <body style="background:white;color:black;font-family:Arial,sans-serif;padding:24px;">
          <p>Preparando ficha de impresión...</p>
        </body>
      </html>
    `);
    win.document.close();

    let familyData = [];
    let prestacionesData = [];

    const [familyResult, prestacionesResult] = await Promise.all([
      supabase.from('family_members').select('*').eq('person_id', printablePerson.id),
      supabase.from('case_prestaciones_readable').select('*').eq('case_id', printableCaseId)
    ]);

    if (familyResult.error) {
      console.error("Error al cargar grupo familiar para impresión:", familyResult.error);
    }

    if (prestacionesResult.error) {
      console.error("Error al cargar prestaciones para impresión:", prestacionesResult.error);
    }

    if (!familyResult.error) {
      familyData = familyResult.data || [];
    }

    if (!prestacionesResult.error) {
      prestacionesData = prestacionesResult.data || [];
    }

    const printableFormData = printSnapshot?.caseId === printableCaseId ? printSnapshot.formData : formData;
    const printableActualDate = printSnapshot?.caseId === printableCaseId ? printSnapshot.actualDate : actualDate;
    const selectedArea = areas.find(a => String(a.id) === String(printableFormData.areaId));
    const today = new Date().toLocaleString('es-AR');
    const personalRows = [
      ['DNI', printableFormData.dni],
      ['Apellido y nombre', printableFormData.apellidoNombre],
      ['Fecha de nacimiento', printableFormData.fechaNac],
      ['Teléfono', printableFormData.telefono],
      ['Domicilio', printableFormData.domicilio],
      ['Estado civil', printableFormData.estadoCivil],
      ['Trabaja', printableFormData.trabaja],
      ['Ingresos', printableFormData.ingresos],
      ['Motivo', printableFormData.motivo],
      ['Solución / Respuesta', printableFormData.solucion || '-'],
      ['Área', selectedArea?.name || '-'],
      ['Fecha del caso', printableActualDate]
    ];

    const familyRows = familyData.map(m => `
      <tr>
        <td>${escapeHtml(m.apellido_nombres)}</td>
        <td>${escapeHtml(m.dni || 'Sin DNI')}</td>
        <td>${escapeHtml(m.observaciones)}</td>
      </tr>
    `).join('');

    const prestacionesRows = prestacionesData.map(p => {
      const cells = Object.entries(p)
        .map(([key, value]) => `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(value)}</td></tr>`)
        .join('');
      return `<table>${cells}</table>`;
    }).join('');

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Ficha de Caso</title>
          <style>
            @page { margin: 20mm; }
            body { background: white; color: black; font-family: Arial, sans-serif; margin: 0; padding: 24px; }
            h1 { margin: 0 0 4px; font-size: 24px; }
            h2 { border-bottom: 1px solid #111; margin-top: 28px; padding-bottom: 6px; font-size: 18px; }
            table { border-collapse: collapse; width: 100%; margin-top: 10px; margin-bottom: 14px; }
            th, td { border: 1px solid #111; padding: 8px; text-align: left; vertical-align: top; }
            th { width: 30%; background: #f2f2f2; }
            footer { border-top: 1px solid #111; margin-top: 32px; padding-top: 10px; font-size: 12px; }
          </style>
        </head>
        <body>
          <header>
            <h1>Sistema de Gestión Social</h1>
            <p>Fecha de generación: ${escapeHtml(today)}</p>
          </header>

          <section>
            <h2>Datos Personales</h2>
            <table>
              <tbody>
                ${personalRows.map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('')}
              </tbody>
            </table>
          </section>

          <section>
            <h2>Grupo Familiar</h2>
            ${familyData.length > 0 ? `
              <table>
                <thead><tr><th>Apellido y nombres</th><th>DNI</th><th>Observaciones</th></tr></thead>
                <tbody>${familyRows}</tbody>
              </table>
            ` : '<p>Sin integrantes.</p>'}
          </section>

          <section>
            <h2>Prestaciones del Caso</h2>
            ${prestacionesData.length > 0 ? prestacionesRows : '<p>Sin prestaciones registradas.</p>'}
          </section>

          <footer>Documento generado automáticamente</footer>
        </body>
      </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
    }, 500);
  };

  if (!profile) {
    return (
      <section className="card flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted">Cargando perfil de operador...</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section id="sectionNewCase" className="card animate-in fade-in slide-in-from-top-4 duration-500">
        <h2 className="text-xl font-bold mb-6 text-white">Nuevo Caso Social</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label>Área de Intervención</label>
              <select 
                id="areaId" 
                value={formData.areaId} 
                onChange={handleInputChange}
                disabled={profile?.role !== 'superadmin'}
                required
              >
                <option value="">Seleccione un área...</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            
            <div className="space-y-2">
              <label>Fecha del Caso (Histórica)</label>
              <input 
                type="date" 
                value={actualDate} 
                onChange={(e) => setActualDate(e.target.value)} 
                className="bg-white/5 border-white/10"
              />
            </div>

            <div className="space-y-2">
              <label>DNI del Ciudadano</label>
              <div className="flex gap-2">
                <input 
                  id="dni" 
                  ref={dniRef}
                  placeholder="DNI sin puntos" 
                  value={formData.dni} 
                  onChange={handleInputChange}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); findPerson(); } }}
                  inputMode="numeric"
                  required
                />
                <button 
                  type="button" 
                  onClick={findPerson}
                  className="secondary px-4!"
                >
                  Buscar
                </button>
              </div>
              {status.person && <p className="text-[10px] font-bold text-accent uppercase ml-1">{status.person}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label>Apellido y Nombres</label>
            <input 
              id="apellidoNombre" 
              placeholder="Ingrese nombre completo" 
              value={formData.apellidoNombre}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label htmlFor="fechaNac">Fecha de Nacimiento</label>
              <div className="flex gap-3 items-center">
                <input 
                  id="fechaNac" 
                  type="date" 
                  value={formData.fechaNac} 
                  onChange={handleInputChange}
                  className="min-w-0 flex-1"
                />
                <div className="flex items-center gap-1.5 bg-accent/10 border border-accent/20 
                                rounded-xl px-3 py-2 shrink-0">
                  <span className="text-lg font-black text-accent leading-none">
                    {calcularEdad(formData.fechaNac) ?? '-'}
                  </span>
                  <span className="text-[10px] text-muted uppercase tracking-widest leading-tight">
                    años
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label>Teléfono / Celular</label>
              <input id="telefono" placeholder="Ej: 3512345678" value={formData.telefono} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <label>Ingresos Estimados</label>
              <input id="ingresos" type="number" step="0.01" placeholder="0.00" value={formData.ingresos} onChange={handleInputChange} />
            </div>
          </div>

          <div className="space-y-2">
            <label>Domicilio Real</label>
            <input id="domicilio" placeholder="Calle, Número, Barrio..." value={formData.domicilio} onChange={handleInputChange} />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label>Estado Civil</label>
              <select id="estadoCivil" value={formData.estadoCivil} onChange={handleInputChange}>
                <option value="">Seleccione...</option>
                <option value="soltero">Soltero/a</option>
                <option value="casado">Casado/a</option>
                <option value="divorciado">Divorciado/a</option>
                <option value="viudo">Viudo/a</option>
                <option value="union">Unión Convivencial</option>
              </select>
            </div>
            <div className="space-y-2">
              <label>Situación Laboral</label>
              <input id="trabaja" placeholder="Ej: Empleado, Desempleado, Jubilado..." value={formData.trabaja} onChange={handleInputChange} />
            </div>
          </div>

          <div className="space-y-2">
            <label>Motivo de la Consulta</label>
            <textarea id="motivo" placeholder="Describa brevemente el motivo..." rows="3" value={formData.motivo} onChange={handleInputChange} required />
          </div>

          <div className="space-y-2">
            <label>Solución / Respuesta</label>
            <textarea id="solucion" placeholder="Describa la solución o respuesta dada..." rows="3" value={formData.solucion} onChange={handleInputChange} />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4">
            <p className={`text-xs font-bold ${status.case.includes('Error') ? 'text-red-400' : 'text-accent uppercase'}`}>
              {status.case}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={clearForm}
                className="secondary"
              >
                Limpiar formulario
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="secondary"
                disabled={!(lastCaseId || printSnapshot?.caseId)}
              >
                🖨️ Imprimir Ficha
              </button>
              <button 
                type="submit" 
                className="primary px-8! py-3! shadow-2xl min-h-[44px] text-sm font-black uppercase tracking-widest" 
                disabled={loading}
              >
                {loading ? 'Guardando...' : 'Registrar Caso'}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* MODAL DE ALERTAS SOCIALES */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-5000 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-card border border-red-500/30 rounded-4xl md:rounded-4xl p-6 md:p-8 max-w-lg w-full shadow-[0_0_50px_rgba(239,68,68,0.2)]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-red-500/10 rounded-xl md:rounded-2xl flex items-center justify-center text-red-500 shrink-0">
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-black text-white">Alertas Sociales</h3>
                <p className="text-[9px] md:text-[10px] uppercase font-bold text-red-400 tracking-widest">Antecedentes críticos</p>
              </div>
            </div>
            
            <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {socialAlerts.map((alerta, idx) => (
                <div key={idx} className="p-4 md:p-5 rounded-[20px] md:rounded-[24px] bg-white/5 border border-red-500/20 shadow-xl transition-all hover:bg-white/8 group">
                  <div className="flex items-start gap-3 md:gap-4">
                    <div className="mt-1 w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-red-500 shrink-0 shadow-[0_0_12px_rgba(239,68,68,0.9)] group-hover:scale-125 transition-transform"></div>
                    <div className="flex-1 space-y-1 text-left">
                      <p className="font-black text-white text-xs md:text-sm leading-snug">
                        {alerta.mensaje}
                      </p>
                      {alerta.fecha && (
                        <p className="text-[8px] md:text-[9px] uppercase font-bold text-white tracking-widest">
                          Fecha: {alerta.fecha}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-4 text-center">
                <button
                  onClick={() => { setShowModal(false); onViewPerson && onViewPerson(currentPerson?.id); }}
                  className="text-[10px] font-black text-muted uppercase tracking-[0.2em] hover:text-white transition-all underline decoration-white/10 underline-offset-8 cursor-pointer min-h-[44px] flex items-center justify-center w-full"
                >
                  Ver ficha completa
                </button>
              </div>
            </div>

            <button 
              onClick={() => setShowModal(false)}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-red-500/20 min-h-[44px]"
            >
              ENTENDIDO
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default NewCaseForm;
