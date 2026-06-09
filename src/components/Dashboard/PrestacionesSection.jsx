import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Pencil, Trash2, X, Check, AlertCircle, Loader2, ChevronRight, MousePointerClick } from 'lucide-react';

// Mapeo tabla por nombre de prestación
const TABLA_MAP = {
  'Pasajes de Ómnibus':   { tabla: 'cic_pasajes',             formType: 'pasajes'      },
  'Carga de Combustible': { tabla: 'cic_combustible',         formType: 'combustible'  },
  'Ayuda Medicamentos':   { tabla: 'cic_medicamentos',        formType: 'medicamentos' },
  'Módulos Alimenticios': { tabla: 'as_modulos_alimenticios', formType: 'modulos'      },
  'Viaje Móvil Social':   { tabla: 'as_viajes_movil',         formType: 'viajes'       },
  'Servicio Fúnebre':     { tabla: 'as_funebre',              formType: 'funebre'      },
  'Construyendo Techo':   { tabla: 'as_construyendo_techo',   formType: 'techo'        },
  'Ayuda Económica':      { tabla: 'cic_economico',           formType: 'economico'    },
};

const getTabla = (h) => {
  if (h.source_table) return h.source_table;
  return TABLA_MAP[h.nombre_prestacion]?.tabla ?? 'case_prestaciones';
};

const getFormType = (h) => {
  return TABLA_MAP[h.nombre_prestacion]?.formType ?? null;
};

// ── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ msg, type }) => {
  if (!msg) return null;
  const colors = {
    success: 'bg-green-500/15 border-green-500/30 text-green-400',
    error:   'bg-red-500/15 border-red-500/30 text-red-400',
    info:    'bg-accent/10 border-accent/20 text-accent',
  };
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-300 ${colors[type] ?? colors.info}`}>
      {type === 'error' && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
      {type === 'success' && <Check className="w-3.5 h-3.5 shrink-0" />}
      {msg}
    </div>
  );
};

const PrestacionesSection = ({ lastCaseId, onOpenSelector, onEditPrestacion }) => {
  const [catalog, setCatalog] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedPrestacion, setSelectedPrestacion] = useState(null);
  const [resumen, setResumen] = useState('');
  const [saving, setSaving] = useState(false);

  // Búsqueda
  const [searchDni, setSearchDni] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeCaseId, setActiveCaseId] = useState(null);
  const [activeCaseInfo, setActiveCaseInfo] = useState(null);

  // Eliminación
  const [deletingId, setDeletingId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Feedback
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    if (lastCaseId) {
      setActiveCaseId(lastCaseId);
      setActiveCaseInfo(null);
      setSearchResults([]);
      setSearchDni('');
    }
  }, [lastCaseId]);

  useEffect(() => {
    if (activeCaseId) {
      loadCatalog(activeCaseId);
      loadHistory(activeCaseId);
    }
  }, [activeCaseId]);

  const loadCatalog = async (caseId) => {
    const { data: caseData } = await supabase.from('cases').select('area_id').eq('id', caseId).single();
    if (!caseData?.area_id) return;
    const { data } = await supabase
      .from('prestaciones_catalog')
      .select('*')
      .eq('area_id', caseData.area_id)
      .eq('active', true)
      .order('nombre');
    if (data) setCatalog(data);
  };

  const loadHistory = async (caseId) => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from('todas_las_prestaciones')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    if (error) {
      const { data: base } = await supabase
        .from('case_prestaciones')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });
      setHistory(base || []);
    } else {
      setHistory(data || []);
    }
    setLoadingHistory(false);
  };

  const searchCases = async () => {
    const dni = searchDni.replace(/\D/g, '');
    if (dni.length < 7) return;
    setSearching(true);
    setSearchResults([]);
    const { data } = await supabase
      .from('cases_readable')
      .select('id, apellido_nombre, motivo, area_name, created_at, actual_date')
      .eq('dni', dni)
      .order('created_at', { ascending: false })
      .limit(10);
    setSearchResults(data || []);
    setSearching(false);
  };

  const selectCase = (c) => {
    setActiveCaseId(c.id);
    setActiveCaseInfo(c);
    setSearchResults([]);
    setDeletingId(null);
  };

  const handleOpenSelector = () => {
    if (activeCaseId) onOpenSelector(activeCaseId);
  };

  const handleSavePrestacion = async () => {
    if (!selectedPrestacion || !activeCaseId) return;
    setSaving(true);
    const { error } = await supabase.from('case_prestaciones').insert({
      case_id: activeCaseId,
      prestacion_id: selectedPrestacion.id,
      nombre_prestacion: selectedPrestacion.nombre,
      resumen: resumen || null,
    });
    if (error) {
      showToast('Error al guardar: ' + error.message, 'error');
    } else {
      showToast('✓ Prestación guardada correctamente', 'success');
      setSelectedPrestacion(null);
      setResumen('');
      loadHistory(activeCaseId);
    }
    setSaving(false);
  };

  // ── EDITAR → abre el modal con datos cargados ───────────────────────────
  const handleEdit = async (h) => {
    const tabla = getTabla(h);
    const formType = getFormType(h);

    // Si no hay formulario específico, no hay nada que editar con el modal
    if (!formType) {
      showToast('Este tipo de prestación no tiene formulario de edición.', 'info');
      return;
    }

    // Traer el registro completo desde la tabla origen
    const { data, error } = await supabase.from(tabla).select('*').eq('id', h.id).single();
    if (error || !data) {
      showToast('No se pudo cargar el registro para editar.', 'error');
      return;
    }

    // Llamar al handler del padre para abrir el modal en modo edición
    onEditPrestacion({ formType, data, recordId: h.id, tabla, nombre: h.nombre_prestacion });
  };

  // ── ELIMINAR ─────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async (h) => {
    setDeleteLoading(true);
    const tabla = getTabla(h);
    const { error } = await supabase.from(tabla).delete().eq('id', h.id);
    if (error) {
      showToast('Error al eliminar: ' + error.message, 'error');
    } else {
      showToast('Prestación eliminada', 'info');
    }
    setDeleteLoading(false);
    setDeletingId(null);
    loadHistory(activeCaseId);
  };

  // Expone recarga al exterior (para que el modal al guardar actualice el historial)
  PrestacionesSection._reload = () => { if (activeCaseId) loadHistory(activeCaseId); };

  return (
    <section className="card space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white">Prestaciones</h2>
          {activeCaseId && (
            <p className="text-[10px] font-bold text-accent uppercase tracking-widest mt-1">
              {activeCaseInfo
                ? `${activeCaseInfo.apellido_nombre} — ${activeCaseInfo.area_name || 'Área'}`
                : `Caso #${activeCaseId.toString().slice(-6).toUpperCase()}`}
            </p>
          )}
        </div>
        <button
          onClick={handleOpenSelector}
          disabled={!activeCaseId}
          className="primary px-4! py-2! text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-30 min-h-[44px]"
        >
          + Nueva Prestación
        </button>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Buscador */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest">Cargar Prestación a Caso Existente</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="DNI del ciudadano..."
            value={searchDni}
            onChange={(e) => setSearchDni(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchCases()}
            className="flex-1"
          />
          <button type="button" onClick={searchCases} disabled={searching} className="secondary px-4! min-h-[44px]">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-accent font-bold uppercase tracking-widest">
              <MousePointerClick className="w-3 h-3" />
              Seleccioná un caso para ver el historial
            </div>
            <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar">
              {searchResults.map(c => (
                <button key={c.id} onClick={() => selectCase(c)}
                  className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-accent/10 border border-white/10 hover:border-accent/40 transition-all group flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm group-hover:text-accent transition-colors">{c.apellido_nombre}</p>
                    <p className="text-[10px] text-muted mt-0.5">
                      {c.area_name} · {c.motivo?.slice(0, 45)}{c.motivo?.length > 45 ? '...' : ''} · {new Date(c.actual_date || c.created_at).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
        {searchResults.length === 0 && searchDni && !searching && (
          <p className="text-xs text-muted/50 italic">Sin resultados para ese DNI.</p>
        )}
      </div>

      {/* Catálogo */}
      <div className="space-y-4 pt-2 border-t border-white/5">
        <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest">Catálogo Disponible</h3>
        <div className="flex flex-wrap gap-2">
          {catalog.length > 0 ? catalog.map(p => (
            <button key={p.id}
              onClick={() => setSelectedPrestacion(selectedPrestacion?.id === p.id ? null : p)}
              className={`text-xs! py-2! px-4! transition-all ${selectedPrestacion?.id === p.id ? 'primary' : 'secondary hover:border-accent/40'}`}>
              {p.nombre}
            </button>
          )) : (
            <p className="text-xs text-muted/50 italic">Seleccione un caso para ver opciones.</p>
          )}
        </div>
        {selectedPrestacion && (
          <div className="mt-3 p-3 rounded-xl bg-accent/5 border border-accent/20 space-y-3">
            <p className="text-[10px] font-black text-accent uppercase tracking-widest">
              Cargando: {selectedPrestacion.nombre}
            </p>
            <input placeholder="Resumen / observaciones (opcional)..." value={resumen}
              onChange={(e) => setResumen(e.target.value)} className="py-2! text-xs w-full" />
            <div className="flex gap-2">
              <button onClick={handleSavePrestacion} disabled={saving} className="primary py-2! px-4! text-xs font-black flex items-center gap-2">
                {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...</> : '✓ Guardar Prestación'}
              </button>
              <button onClick={() => { setSelectedPrestacion(null); setResumen(''); }} className="secondary py-2! px-4! text-xs">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Historial */}
      <div className="space-y-3 pt-4 border-t border-white/5">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest">
            Historial del Caso
            {history.length > 0 && (
              <span className="ml-2 bg-accent/20 text-accent px-1.5 py-0.5 rounded-full text-[9px] font-black">
                {history.length}
              </span>
            )}
          </h3>
          {loadingHistory && (
            <p className="text-[10px] text-accent animate-pulse flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Cargando...
            </p>
          )}
        </div>

        {history.length > 0 && !deletingId && (
          <p className="text-[10px] text-muted/50 italic">
            Usá los botones <span className="text-accent font-bold">✏ Editar</span> y <span className="text-red-400 font-bold">🗑 Eliminar</span> en cada fila.
          </p>
        )}

        <div className="space-y-2">
          {history.length > 0 ? history.map(h => (
            <div key={h.id}
              className={`rounded-xl border transition-all duration-200 ${
                deletingId === h.id
                  ? 'bg-red-500/8 border-red-500/30 p-3'
                  : 'bg-white/3 border-white/8 p-3 hover:bg-white/6 hover:border-white/15'
              }`}>

              {deletingId === h.id ? (
                <div className="space-y-2">
                  <p className="text-xs text-red-400 font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    ¿Eliminar "{h.nombre_prestacion}"? No se puede deshacer.
                  </p>
                  {h.resumen && (
                    <p className="text-[10px] text-muted/50 pl-5">
                      {h.resumen.slice(0, 70)}{h.resumen.length > 70 ? '...' : ''}
                    </p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleDeleteConfirm(h)}
                      disabled={deleteLoading}
                      className="py-1.5! px-4! text-xs font-bold rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-all flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {deleteLoading
                        ? <><Loader2 className="w-3 h-3 animate-spin" /> Eliminando...</>
                        : <><Trash2 className="w-3 h-3" /> Sí, eliminar</>
                      }
                    </button>
                    <button onClick={() => setDeletingId(null)} className="secondary py-1.5! px-3! text-xs flex items-center gap-1.5">
                      <X className="w-3 h-3" /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white leading-tight">{h.nombre_prestacion || 'S/D'}</p>
                    {h.resumen && (
                      <p className="text-[11px] text-muted mt-0.5 truncate" title={h.resumen}>{h.resumen}</p>
                    )}
                    <p className="text-[10px] text-white/30 font-mono mt-1">
                      {new Date(h.created_at).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleEdit(h)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold
                                 bg-accent/15 border border-accent/30 text-accent
                                 hover:bg-accent/25 hover:border-accent/50
                                 active:scale-95 transition-all"
                      title="Editar prestación"
                    >
                      <Pencil className="w-3 h-3" />
                      Editar
                    </button>
                    <button
                      onClick={() => setDeletingId(h.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold
                                 bg-red-500/10 border border-red-500/25 text-red-400
                                 hover:bg-red-500/20 hover:border-red-500/40
                                 active:scale-95 transition-all"
                      title="Eliminar prestación"
                    >
                      <Trash2 className="w-3 h-3" />
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )) : (
            <div className="text-center py-8">
              {!activeCaseId
                ? <p className="text-muted/50 text-xs">Buscá un caso por DNI o registrá uno nuevo.</p>
                : !loadingHistory && <p className="text-muted/40 text-xs italic">Este caso no tiene prestaciones registradas.</p>
              }
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default PrestacionesSection;