import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Save, Loader2 } from 'lucide-react';
import { hoyLocal, formatFecha } from '../../lib/fechas';

// ── Modal de edición de caso ─────────────────────────────────────────────────
const EditCaseModal = ({ caseData, person, areas, onClose, onSaved }) => {
  const [form, setForm] = useState({
    motivo:      caseData.motivo      || '',
    solucion:    caseData.solucion    || '',
    ingresos:    caseData.ingresos    ?? '',
    actual_date: caseData.actual_date ? caseData.actual_date.split('T')[0] : (caseData.created_at?.split('T')[0] || ''),
    estado:      caseData.estado      || 'abierto',
    // Datos de la persona: se cargan desde la tabla persons (ver efecto abajo)
    telefono:    '',
    domicilio:   '',
    trabaja:     '',
    estado_civil: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  // ERROR CORREGIDO: antes estos campos se tomaban de la fila del CASO, que no los guarda.
  // El formulario abría vacío y al guardar borraba teléfono, domicilio, estado civil y
  // situación laboral de la persona. Ahora se leen de la ficha real de la persona.
  const [personaOriginal, setPersonaOriginal] = useState(null);
  const [cargandoPersona, setCargandoPersona] = useState(!!caseData.person_id);

  useEffect(() => {
    if (!caseData.person_id) return undefined;
    let vigente = true;
    supabase
      .from('persons')
      .select('telefono, domicilio, estado_civil, trabaja_actualmente')
      .eq('id', caseData.person_id)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (!vigente) return;
        if (err || !data) {
          setError('No se pudieron cargar los datos de la persona. Los datos personales no se modificarán.');
        } else {
          const original = {
            telefono:     data.telefono || '',
            domicilio:    data.domicilio || '',
            trabaja:      data.trabaja_actualmente || '',
            estado_civil: data.estado_civil || '',
          };
          setPersonaOriginal(original);
          setForm(p => ({ ...p, ...original }));
        }
        setCargandoPersona(false);
      });
    return () => { vigente = false; };
  }, [caseData.person_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      // Actualizar caso
      const { error: cErr } = await supabase.from('cases').update({
        motivo:      form.motivo      || null,
        solucion:    form.solucion    || null,
        ingresos:    parseFloat(form.ingresos) || 0,
        actual_date: form.actual_date || null,
        estado:      form.estado,
      }).eq('id', caseData.id);
      if (cErr) throw cErr;

      // Actualizar SOLO los datos de la persona que el usuario cambió.
      // Si no se pudieron cargar (personaOriginal = null), no se toca la persona.
      if (caseData.person_id && personaOriginal) {
        const columna = { telefono: 'telefono', domicilio: 'domicilio', trabaja: 'trabaja_actualmente', estado_civil: 'estado_civil' };
        const cambios = {};
        for (const [campo, col] of Object.entries(columna)) {
          const nuevo = (form[campo] || '').trim();
          if (nuevo !== (personaOriginal[campo] || '').trim()) cambios[col] = nuevo || null;
        }
        if (Object.keys(cambios).length > 0) {
          const { error: pErr } = await supabase.from('persons').update({
            ...cambios,
            updated_at: new Date().toISOString(),
          }).eq('id', caseData.person_id);
          if (pErr) throw pErr;
        }
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const areaName = areas.find(a => a.id === caseData.area_id)?.name || '-';

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-xl z-6000 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-4xl border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.5)] flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-black text-white">Editar Caso</h2>
            <p className="text-[10px] uppercase font-bold text-accent tracking-widest mt-1">
              {person?.apellido_nombre || caseData.apellido_nombre} · {areaName}
            </p>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar" style={{ minHeight: 0 }}>
          <div className="p-6 space-y-5">

            {/* Datos del caso */}
            <p className="text-[10px] font-black text-muted uppercase tracking-widest">Datos del Caso</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Fecha del Caso</label>
                <input type="date" value={form.actual_date} onChange={e => setForm(p => ({ ...p, actual_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Estado</label>
                <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))} className="min-h-11">
                  <option value="abierto">Abierto</option>
                  <option value="en_seguimiento">En seguimiento</option>
                  <option value="resuelto">Resuelto</option>
                  <option value="cerrado">Cerrado</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Ingresos Estimados ($)</label>
              <input type="number" step="0.01" placeholder="0.00" value={form.ingresos} onChange={e => setForm(p => ({ ...p, ingresos: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Motivo de la Consulta</label>
              <textarea rows="3" placeholder="Describa brevemente el motivo..." value={form.motivo} onChange={e => setForm(p => ({ ...p, motivo: e.target.value }))} required />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Solución / Respuesta</label>
              <textarea rows="3" placeholder="Describa la solución o respuesta dada..." value={form.solucion} onChange={e => setForm(p => ({ ...p, solucion: e.target.value }))} />
            </div>

            {/* Datos de la persona */}
            <p className="text-[10px] font-black text-muted uppercase tracking-widest pt-2 border-t border-white/5">Datos de la Persona</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Teléfono / Celular</label>
                <input placeholder="Ej: 3512345678" value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Situación Laboral</label>
                <input placeholder="Ej: Empleado, Desempleado..." value={form.trabaja} onChange={e => setForm(p => ({ ...p, trabaja: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Domicilio</label>
              <input placeholder="Calle, Número, Barrio..." value={form.domicilio} onChange={e => setForm(p => ({ ...p, domicilio: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest">Estado Civil</label>
              <select value={form.estado_civil} onChange={e => setForm(p => ({ ...p, estado_civil: e.target.value }))} className="min-h-11">
                <option value="">Seleccione...</option>
                <option value="soltero">Soltero/a</option>
                <option value="casado">Casado/a</option>
                <option value="divorciado">Divorciado/a</option>
                <option value="viudo">Viudo/a</option>
                <option value="union">Unión Convivencial</option>
              </select>
            </div>

            {error && (
              <p className="text-xs text-red-400 font-bold bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                ⚠ {error}
              </p>
            )}
          </div>

          {/* Footer sticky */}
          <div className="p-6 border-t border-white/5 flex gap-3 bg-white/2 shrink-0">
            <button type="submit" disabled={saving || cargandoPersona}
              className="primary flex-1 py-3! flex items-center justify-center gap-2 font-black">
              {cargandoPersona ? <><Loader2 className="w-4 h-4 animate-spin" /> Cargando datos...</>
                : saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : <><Save className="w-4 h-4" /> Guardar Cambios</>}
            </button>
            <button type="button" onClick={onClose} className="secondary px-8! py-3!">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CasesList = ({ areas, profile, onViewPerson }) => {
  const [filters, setFilters] = useState({
    dni: '',
    name: '',
    areaId: '',
    estado: '',
    from: '',
    to: '',
    prestacion: ''
  });
  const [grouped, setGrouped] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [mostrarFiltros, setMostrarFiltros] = useState(false); // en celular los filtros arrancan plegados
  const [status, setStatus] = useState('Aplicá filtros y cargá casos.');
  const [loading, setLoading] = useState(false);
  const [prestacionesList, setPrestacionesList] = useState([]);
  const [editCase, setEditCase] = useState(null);   // { caseData, person }

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(0);
  const [allCases, setAllCases] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  // Determinar si el usuario puede ver todos los casos
  // superadmin siempre puede ver todo; operadores según can_view_all
  const canViewAll = profile?.role === 'superadmin' || profile?.can_view_all === true;
  const userAreaId = profile?.default_area_id;
  const isOperator = profile?.role === 'operator';

  useEffect(() => {
    fetchCases(filters);
  }, []);

  useEffect(() => {
    const loadPrestaciones = async () => {
      try {
        const { data, error } = await supabase
          .from('todas_las_prestaciones')
          .select('nombre_prestacion')
          .order('nombre_prestacion');
        if (error) {
          console.error('Error cargando prestaciones:', error);
          return;
        }
        if (data) {
          const unique = [...new Set(data.map(p => p.nombre_prestacion).filter(Boolean))];
          console.log('Prestaciones cargadas:', unique);
          setPrestacionesList(unique);
        } else {
          console.log('No hay datos de prestaciones');
        }
      } catch (err) {
        console.error('Error en loadPrestaciones:', err);
      }
    };
    loadPrestaciones();
  }, []);

  const fetchCases = async (currentFilters = null, isLoadMore = false) => {
    const f = currentFilters || filters;
    setLoading(true);
    setStatus('Buscando casos...');
    try {
      const LIMIT = 200;
      const nextPage = isLoadMore ? currentPage + 1 : 0;

      let q = supabase
        .from('cases')
        .select(`
          *,
          creador:profiles!created_by (full_name),
          persona:persons!person_id (apellido_nombre, dni, domicilio)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Si hay filtro de prestación, obtener los case_id correspondientes
      let prestacionCaseIds = null;
      if (f.prestacion) {
        let prestQ = supabase
          .from('todas_las_prestaciones')
          .select('case_id')
          .eq('nombre_prestacion', f.prestacion);
        if (f.from) prestQ = prestQ.gte('created_at', f.from);
        if (f.to)   prestQ = prestQ.lte('created_at', f.to + 'T23:59:59');
        const { data: prestData } = await prestQ;
        prestacionCaseIds = (prestData || []).map(p => p.case_id).filter(Boolean);
        if (prestacionCaseIds.length === 0) {
          setAllCases([]);
          setGrouped([]);
          setTotalCount(0);
          setStatus('No se encontraron atenciones con esa prestación.');
          setLoading(false);
          return;
        }
        q = q.in('id', prestacionCaseIds);
      }

      // --- FILTRO DE VISIBILIDAD POR ÁREA ---
      if (!canViewAll) {
        if (userAreaId) {
          q = q.eq('area_id', userAreaId);
        } else {
          setAllCases([]);
          setGrouped([]);
          setTotalCount(0);
          setStatus('No tenés un área asignada. Contactá al administrador.');
          setLoading(false);
          return;
        }
      } else {
        if (f.areaId) q = q.eq('area_id', f.areaId);
      }
      // --- FIN FILTRO VISIBILIDAD ---

      if (f.from) q = q.gte('created_at', f.from);
      if (f.to)   q = q.lte('created_at', f.to + 'T23:59:59');

      // Server-side filters
      if (f.dni) {
        q = q.ilike('dni', `%${f.dni}%`);
      }
      if (f.name) {
        q = q.ilike('apellido_nombre', `%${f.name}%`);
      }
      if (f.estado) {
        q = q.eq('estado', f.estado);
      }

      // Rango de paginación
      const start = nextPage * LIMIT;
      const end = (nextPage + 1) * LIMIT - 1;
      q = q.range(start, end);

      const { data, count, error } = await q;
      if (error) throw error;

      let newRows = data || [];

      // Cargar prestaciones solo para los casos nuevos
      if (newRows.length > 0) {
        const caseIds = newRows.map(c => c.id);
        let prestQuery = supabase
          .from('todas_las_prestaciones')
          .select('*')
          .in('case_id', caseIds);
        
        if (f.prestacion) {
          prestQuery = prestQuery.eq('nombre_prestacion', f.prestacion);
        }
        
        const { data: prestDetalle } = await prestQuery;
        
        const prestMap = {};
        (prestDetalle || []).forEach(p => {
          if (!prestMap[p.case_id]) prestMap[p.case_id] = [];
          prestMap[p.case_id].push(p);
        });

        newRows = newRows.map(c => ({ 
          ...c, 
          prestaciones_filtradas: prestMap[c.id] || [],
          todas_prestaciones: prestMap[c.id] || []
        }));
      }

      const updatedCases = isLoadMore ? [...allCases, ...newRows] : newRows;
      setAllCases(updatedCases);
      setCurrentPage(nextPage);
      setTotalCount(count || 0);

      // Agrupar por person_id
      const map = {};
      updatedCases.forEach(c => {
        const pid = c.person_id;
        if (!map[pid]) {
          map[pid] = {
            person_id: pid,
            dni: c.persona?.dni || c.dni || '-',
            apellido_nombre: c.persona?.apellido_nombre || c.apellido_nombre || '-',
            domicilio: c.persona?.domicilio || c.domicilio || '-',
            cases: []
          };
        }
        map[pid].cases.push(c);
      });

      // Ordenar personas por fecha del caso más reciente
      const persons = Object.values(map).sort((a, b) =>
        new Date(b.cases[0].created_at) - new Date(a.cases[0].created_at)
      );

      setGrouped(persons);
      setStatus(`OK. ${persons.length} persona(s) encontradas — ${updatedCases.length} caso(s) en total.`);
    } catch (error) {
      console.error(error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { id, value } = e.target;
    setFilters(prev => ({ ...prev, [id]: value }));
  };

  const clearFilters = () => {
    const emptyFilters = { dni: '', name: '', areaId: '', estado: '', from: '', to: '', prestacion: '' };
    setFilters(emptyFilters);
    fetchCases(emptyFilters, false);
  };

  const toggleExpand = (personId) => {
    setExpanded(prev => ({ ...prev, [personId]: !prev[personId] }));
  };

  const renderOwner = (c) => c.creador?.full_name || 'Sistema';

  const renderAreaName = (c) =>
    c.area_name || areas.find(a => a.id === c.area_id)?.name || '-';

  const handleExportExcel = async () => {
    if (grouped.length === 0) return;

    try {
      const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');
      const wb = XLSX.utils.book_new();

      // Encabezados
      const rows = [
        [
          'Apellido y Nombre', 'DNI', 'Domicilio', 'Área',
          'Motivo', 'Solución',
          'Ingresos', 'Estado', 'Fecha del Caso',
          'Prestaciones entregadas', 'Detalle prestaciones'
        ]
      ];

      grouped.forEach(person => {
        person.cases.forEach(c => {
          const prestaciones = c.todas_prestaciones || [];

          // Nombres de prestaciones separados por " | "
          const prestNombres = prestaciones.length > 0
            ? prestaciones.map(p => p.nombre_prestacion).filter(Boolean).join(' | ')
            : '-';

          // Resúmenes / detalles de prestaciones separados por " | "
          const prestDetalles = prestaciones.length > 0
            ? prestaciones
                .map(p => [p.nombre_prestacion, p.resumen].filter(Boolean).join(': '))
                .join(' | ')
            : '-';

          rows.push([
            person.apellido_nombre,
            person.dni,
            person.domicilio || '-',
            c.area_name || areas.find(a => a.id === c.area_id)?.name || '-',
            c.motivo   || '-',
            c.solucion || '-',
            c.ingresos || 0,
            c.estado   || 'abierto',
            formatFecha(c.actual_date || c.created_at),
            prestNombres,
            prestDetalles
          ]);
        });
      });

      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Ancho de columnas automático (aproximado)
      ws['!cols'] = [
        { wch: 30 }, // Apellido y Nombre
        { wch: 14 }, // DNI
        { wch: 35 }, // Domicilio
        { wch: 18 }, // Área
        { wch: 40 }, // Motivo
        { wch: 40 }, // Solución
        { wch: 12 }, // Ingresos
        { wch: 16 }, // Estado
        { wch: 16 }, // Fecha
        { wch: 40 }, // Prestaciones
        { wch: 60 }, // Detalle prestaciones
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Atenciones');

      const fecha = hoyLocal();
      XLSX.writeFile(wb, `atenciones_${fecha}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('Error al exportar: ' + err.message);
    }
  };

  return (
    <section id="screenCases" className="screen active space-y-6">
      <section className="card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <div className="flex flex-col">
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">Atenciones</h2>
            <p className="text-[10px] md:text-xs font-bold text-muted uppercase tracking-widest mt-1">
              Gestión y filtrado de casos registrados
              {/* Indicador de visibilidad */}
              {!canViewAll && userAreaId && (
                <span className="ml-2 text-accent">
                  — Solo tu área: {areas.find(a => a.id === userAreaId)?.name || '...'}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button className="secondary flex-1 md:flex-none py-3! px-6! text-xs font-black uppercase tracking-widest min-h-11" onClick={() => fetchCases(filters)} disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
            <button className="secondary flex-1 md:flex-none py-3! px-6! text-xs font-black uppercase tracking-widest min-h-11" onClick={clearFilters}>
              Limpiar
            </button>
            <button
              className="secondary flex-1 md:flex-none py-3! px-6! text-xs font-black uppercase tracking-widest min-h-11"
              onClick={handleExportExcel}
              disabled={grouped.length === 0}
              title="Exportar resultados a Excel"
            >
              ⬇ Excel
            </button>
          </div>
        </div>

        {/* Celular: los filtros ocupaban toda la pantalla antes de ver un resultado */}
        <button
          type="button"
          onClick={() => setMostrarFiltros(v => !v)}
          aria-expanded={mostrarFiltros}
          className="md:hidden secondary tap w-full justify-between! mb-4 text-sm"
        >
          <span>Filtros{Object.values(filters).filter(Boolean).length > 0 ? ` (${Object.values(filters).filter(Boolean).length} activos)` : ''}</span>
          <span aria-hidden>{mostrarFiltros ? '▲' : '▼'}</span>
        </button>
        <div className={mostrarFiltros ? '' : 'hidden md:block'}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted">Filtro DNI</label>
            <input id="dni" placeholder="Ej: 30123456" value={filters.dni} onChange={handleFilterChange} className="py-3! text-sm min-h-11" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted">Filtro Nombre</label>
            <input id="name" placeholder="Ej: Pérez" value={filters.name} onChange={handleFilterChange} className="py-3! text-sm min-h-11" />
          </div>
          {/* El filtro de área solo se muestra a quienes pueden ver todo */}
          {canViewAll && (
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-muted">Filtro Área</label>
              <select id="areaId" value={filters.areaId} onChange={handleFilterChange} className="py-3! text-sm min-h-11">
                <option value="">Todas las áreas</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted">Prestación entregada</label>
            <select 
              id="prestacion" 
              value={filters.prestacion} 
              onChange={handleFilterChange} 
              className="py-3! text-sm min-h-11"
            >
              <option value="">Todas las prestaciones</option>
              {prestacionesList.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted">Estado</label>
            <select id="estado" value={filters.estado} onChange={handleFilterChange} className="py-3! text-sm min-h-11">
              <option value="">Todos los estados</option>
              <option value="abierto">Abierto</option>
              <option value="en_seguimiento">En seguimiento</option>
              <option value="resuelto">Resuelto</option>
              <option value="cerrado">Cerrado</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted">Desde fecha</label>
            <input id="from" type="date" value={filters.from} onChange={handleFilterChange} className="py-3! text-sm min-h-11" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted">Hasta fecha</label>
            <input id="to" type="date" value={filters.to} onChange={handleFilterChange} className="py-3! text-sm min-h-11" />
          </div>
        </div>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-white/2 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <p className={`text-[10px] font-black uppercase tracking-widest ${loading ? 'loading text-accent' : 'text-muted'}`}>{status}</p>
            {totalCount > allCases.length && (
              <p className="text-[10px] font-bold text-accent animate-pulse">
                Mostrando {allCases.length} de {totalCount} casos
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${grouped.length > 0 ? 'bg-accent' : 'bg-muted/20'}`}></div>
              <span className="text-[10px] font-black text-white">{grouped.length} personas</span>
            </div>
            <span className="text-[10px] font-black text-muted">{allCases.length} casos cargados</span>
          </div>
        </div>

        {/* Lista agrupada por persona */}
        <div className="mt-6 space-y-3">
          {grouped.length === 0 && (
            <p className="text-center py-12 text-muted italic text-xs uppercase tracking-widest opacity-40">
              No se encontraron registros.
            </p>
          )}

          {grouped.map(person => {
            const isOpen = expanded[person.person_id];
            const lastCase = person.cases[0];
            const totalCases = person.cases.length;

            return (
              <div key={person.person_id} className="rounded-2xl border border-white/8 overflow-hidden bg-white/2">

                {/* Fila principal de la persona */}
                <div className="flex flex-wrap md:flex-nowrap items-center gap-3 md:gap-4 px-4 md:px-5 py-4">
                  {/* Avatar inicial */}
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-black text-accent">
                      {person.apellido_nombre.charAt(0)}
                    </span>
                  </div>

                  {/* Info persona */}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-white text-sm uppercase tracking-tight truncate">
                      {person.apellido_nombre}
                    </p>
                    <p className="text-[10px] text-muted font-mono mt-0.5">
                      DNI {person.dni}
                      <span className="ml-3 text-accent font-black">{totalCases} caso{totalCases !== 1 ? 's' : ''}</span>
                    </p>
                  </div>

                  {/* Acciones (en celular pasan a una fila propia, a lo ancho) */}
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:shrink-0">
                    <button
                      className="secondary tap md:min-h-9 py-2! px-4! text-[10px] font-black uppercase tracking-widest min-h-9 flex-1 md:flex-none"
                      onClick={() => onViewPerson && onViewPerson(person.person_id)}
                    >
                      Ver Ficha
                    </button>
                    {!isOperator && (
                      <button
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold
                                   bg-accent/15 border border-accent/30 text-accent
                                   hover:bg-accent/25 hover:border-accent/50
                                   active:scale-95 transition-all min-h-9 tap md:min-h-9 flex-1 md:flex-none justify-center"
                        onClick={() => setEditCase({ caseData: lastCase, person: { apellido_nombre: person.apellido_nombre, ...lastCase } })}
                      >
                        ✏ Editar
                      </button>
                    )}
                    {!isOperator && (
                      <select
                        value={lastCase.estado || 'abierto'}
                        onChange={async (e) => {
                          const nuevoEstado = e.target.value;
                          const { error } = await supabase.from('cases').update({ estado: nuevoEstado }).eq('id', lastCase.id);
                          if (error) alert('No se pudo cambiar el estado: ' + error.message);
                          fetchCases();
                        }}
                        aria-label="Estado del caso"
                        className="text-[9px] py-1! px-2! min-h-7 tap md:min-h-7 w-full md:w-auto rounded-lg border border-white/10 bg-white/5 text-white/60 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="abierto">Abierto</option>
                        <option value="en_seguimiento">En seguimiento</option>
                        <option value="resuelto">Resuelto</option>
                        <option value="cerrado">Cerrado</option>
                      </select>
                    )}
                    {totalCases > 1 && (
                      <button
                        className="secondary tap md:min-h-9 py-2! px-3! text-[10px] font-black uppercase tracking-widest min-h-9 w-full md:w-auto"
                        onClick={() => toggleExpand(person.person_id)}
                        title={isOpen ? 'Ocultar casos' : 'Ver todos los casos'}
                      >
                        {isOpen ? '▲' : `▼ ${totalCases}`}
                      </button>
                    )}
                  </div>
                </div>

                {/* Último caso resumido (siempre visible) */}
                <div className="px-4 md:px-5 pb-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/5 pt-3">
                  <span className="pill text-[9px]">{renderAreaName(lastCase)}</span>
                  {/* Badge de estado */}
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    (lastCase.estado || 'abierto') === 'resuelto'
                      ? 'bg-green-500/15 text-green-400'
                      : (lastCase.estado || 'abierto') === 'en_seguimiento'
                      ? 'bg-yellow-500/15 text-yellow-400'
                      : (lastCase.estado || 'abierto') === 'cerrado'
                      ? 'bg-white/10 text-white/30'
                      : 'bg-blue-500/15 text-blue-400'
                  }`}>
                    {lastCase.estado || 'abierto'}
                  </span>
                  <span className="text-[10px] text-muted w-full md:w-auto md:truncate md:max-w-50" title={lastCase.motivo}>{lastCase.motivo || 'Sin motivo'}</span>
                  <span className="text-[10px] font-mono text-accent ml-auto">${lastCase.ingresos?.toLocaleString() || '0'}</span>
                  <span className="text-[10px] text-muted/50 font-mono">
                    {formatFecha(lastCase.actual_date || lastCase.created_at)}
                  </span>
                  {lastCase.prestaciones_filtradas?.length > 0 && filters.prestacion && (
                    <span className="flex items-center gap-1 bg-green-500/10 border 
                                   border-green-500/20 rounded-full px-2 py-0.5">
                      <span className="text-green-400 text-[9px]">✓</span>
                      <span className="text-[9px] font-bold text-green-300">
                        {lastCase.prestaciones_filtradas[0].nombre_prestacion}
                        {lastCase.prestaciones_filtradas[0].resumen 
                          ? ` — ${lastCase.prestaciones_filtradas[0].resumen}` 
                          : ''}
                      </span>
                    </span>
                  )}
                  {lastCase.todas_prestaciones?.length > 0 && !filters.prestacion && (
                    <span className="flex items-center gap-1 bg-blue-500/10 border 
                                   border-blue-500/20 rounded-full px-2 py-0.5">
                      <span className="text-blue-400 text-[9px]">◆</span>
                      <span className="text-[9px] font-bold text-blue-300">
                        {lastCase.todas_prestaciones.length} prestación{lastCase.todas_prestaciones.length !== 1 ? 'es' : ''}
                      </span>
                    </span>
                  )}
                </div>

                {/* Casos expandidos */}
                {isOpen && (
                  <div className="border-t border-white/5 divide-y divide-white/5">
                    {person.cases.map((c, idx) => (
                      <div key={c.id}>
                          <div className="px-5 py-3 flex flex-wrap items-center gap-3 bg-white/2 hover:bg-white/5 transition-colors">
                            <span className="text-[9px] font-mono text-muted/50 w-20 shrink-0">
                              {formatFecha(c.actual_date || c.created_at)}
                            </span>
                            <span className="pill text-[9px]">{renderAreaName(c)}</span>
                            <span className="text-[10px] text-muted flex-1 truncate" title={c.motivo}>{c.motivo || 'Sin motivo'}</span>
                            <span className="text-[10px] font-mono text-accent">${c.ingresos?.toLocaleString() || '0'}</span>
                            <span className="text-[9px] text-muted/40">{renderOwner(c)}</span>
                            {!isOperator && (
                              <button
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold
                                           bg-accent/12 border border-accent/25 text-accent
                                           hover:bg-accent/20 active:scale-95 transition-all"
                                onClick={() => setEditCase({ caseData: c, person: { apellido_nombre: person.apellido_nombre, ...c } })}
                              >
                                ✏ Editar
                              </button>
                            )}
                            {!isOperator && (
                              <select
                                value={c.estado || 'abierto'}
                                onChange={async (e) => {
                                  const nuevoEstado = e.target.value;
                                  await supabase.from('cases').update({ estado: nuevoEstado }).eq('id', c.id);
                                  fetchCases();
                                }}
                                className="text-[9px] py-1! px-2! min-h-7 rounded-lg border border-white/10 bg-white/5 text-white/60 cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="abierto">Abierto</option>
                                <option value="en_seguimiento">En seguimiento</option>
                                <option value="resuelto">Resuelto</option>
                                <option value="cerrado">Cerrado</option>
                              </select>
                            )}
                          </div>
                        {/* Prestaciones - según si hay filtro o no */}
                        {filters.prestacion && c.prestaciones_filtradas?.length > 0 && (
                          <div className="w-full mt-2 pt-2 px-5 pb-3 border-t border-white/5">
                            <p className="text-[9px] uppercase font-black text-muted tracking-widest mb-1.5">
                              Prestación entregada
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {c.prestaciones_filtradas.map((p, i) => (
                                <div key={i} 
                                     className="flex items-center gap-1.5 bg-green-500/10 border 
                                                border-green-500/20 rounded-lg px-2.5 py-1.5">
                                  <span className="text-green-400 text-[10px]">✓</span>
                                  <span className="text-[10px] font-bold text-green-300">
                                    {p.nombre_prestacion}
                                  </span>
                                  {p.resumen && (
                                    <span className="text-[10px] text-white/40 ml-1">
                                      — {p.resumen}
                                    </span>
                                  )}
                                  <span className="text-[9px] text-white/25 ml-1 font-mono">
                                    {new Date(p.created_at).toLocaleDateString('es-AR')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {!filters.prestacion && c.todas_prestaciones?.length > 0 && (
                          <div className="w-full mt-2 pt-2 px-5 pb-3 border-t border-white/5">
                            <p className="text-[9px] uppercase font-black text-muted tracking-widest mb-1.5">
                              Prestaciones entregadas ({c.todas_prestaciones.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {c.todas_prestaciones.map((p, i) => (
                                <div key={i} 
                                     className="flex items-center gap-1.5 bg-blue-500/10 border 
                                                border-blue-500/20 rounded-lg px-2.5 py-1.5">
                                  <span className="text-blue-400 text-[10px]">◆</span>
                                  <span className="text-[10px] font-bold text-blue-300">
                                    {p.nombre_prestacion}
                                  </span>
                                  {p.resumen && (
                                    <span className="text-[10px] text-white/40 ml-1">
                                      — {p.resumen}
                                    </span>
                                  )}
                                  <span className="text-[9px] text-white/25 ml-1 font-mono">
                                    {new Date(p.created_at).toLocaleDateString('es-AR')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Paginación / Cargar más */}
        {totalCount > allCases.length && (
          <div className="mt-6 flex justify-center">
            <button
              className="primary py-3! px-8! text-xs font-black uppercase tracking-widest flex items-center gap-2"
              onClick={() => fetchCases(filters, true)}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando más...
                </>
              ) : (
                'Cargar más casos'
              )}
            </button>
          </div>
        )}
      </section>

      {/* Modal de edición */}
      {editCase && (
        <EditCaseModal
          caseData={editCase.caseData}
          person={editCase.person}
          areas={areas}
          onClose={() => setEditCase(null)}
          onSaved={() => { fetchCases(filters); }}
        />
      )}
    </section>
  );
};

export default CasesList;