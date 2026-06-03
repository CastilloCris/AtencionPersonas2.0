import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const PrestacionesSection = ({ lastCaseId, onOpenSelector }) => {
  const [catalog, setCatalog] = useState([]);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('');
  const [selectedPrestacion, setSelectedPrestacion] = useState(null);
  const [resumen, setResumen] = useState('');
  const [saving, setSaving] = useState(false);
  // Búsqueda de caso existente
  const [searchDni, setSearchDni] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeCaseId, setActiveCaseId] = useState(null);
  const [activeCaseInfo, setActiveCaseInfo] = useState(null);

  // Cuando llega un nuevo caso desde el formulario, lo usamos como activo
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
    const { data } = await supabase.from('prestaciones_catalog').select('*').eq('area_id', caseData.area_id).eq('active', true).order('nombre');
    if (data) setCatalog(data);
  };

  const loadHistory = async (caseId) => {
    setStatus('Cargando...');
    const { data, error } = await supabase
      .from('todas_las_prestaciones')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error cargando historial:', error);
      setStatus('Error al cargar');
    } else {
      setHistory(data || []);
      setStatus('');
    }
  };

  const handleSavePrestacion = async () => {
    if (!selectedPrestacion || !activeCaseId) return;
    setSaving(true);
    setStatus('Guardando...');
    const { error } = await supabase.from('case_prestaciones').insert({
      case_id: activeCaseId,
      prestacion_id: selectedPrestacion.id,
      nombre_prestacion: selectedPrestacion.nombre,
      resumen: resumen || null,
    });
    if (error) {
      setStatus('Error: ' + error.message);
    } else {
      setStatus('✓ Guardada');
      setSelectedPrestacion(null);
      setResumen('');
      loadHistory(activeCaseId);
      setTimeout(() => setStatus(''), 2000);
    }
    setSaving(false);
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
  };

  const handleOpenSelector = () => {
    if (activeCaseId) onOpenSelector(activeCaseId);
  };

  return (
    <section className="card space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white">Prestaciones</h2>
          {activeCaseId && (
            <p className="text-[10px] font-bold text-accent uppercase tracking-widest mt-1">
              {activeCaseInfo
                ? `${activeCaseInfo.apellido_nombre} — ${activeCaseInfo.area_name || 'Área'}`
                : `Caso #${activeCaseId.toString().slice(-6)}`}
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

      {/* Buscador de caso existente */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest">Cargar prestación a caso existente</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="DNI del ciudadano..."
            value={searchDni}
            onChange={(e) => setSearchDni(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchCases()}
            className="flex-1"
          />
          <button
            type="button"
            onClick={searchCases}
            disabled={searching}
            className="secondary px-4! min-h-[44px]"
          >
            {searching ? '...' : 'Buscar'}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {searchResults.map(c => (
              <button
                key={c.id}
                onClick={() => selectCase(c)}
                className="w-full text-left p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all"
              >
                <p className="font-bold text-white text-sm">{c.apellido_nombre}</p>
                <p className="text-[10px] text-muted mt-0.5">
                  {c.area_name} · {c.motivo?.slice(0, 50)}{c.motivo?.length > 50 ? '...' : ''} · {new Date(c.actual_date || c.created_at).toLocaleDateString('es-AR')}
                </p>
              </button>
            ))}
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
            <button
              key={p.id}
              onClick={() => setSelectedPrestacion(selectedPrestacion?.id === p.id ? null : p)}
              className={`text-xs! py-2! px-4! transition-all ${
                selectedPrestacion?.id === p.id
                  ? 'primary'
                  : 'secondary hover:border-accent/40'
              }`}
            >
              {p.nombre}
            </button>
          )) : (
            <p className="text-xs text-muted/50 italic">Seleccione un caso para ver opciones.</p>
          )}
        </div>

        {/* Formulario de carga cuando hay prestación seleccionada */}
        {selectedPrestacion && (
          <div className="mt-3 p-3 rounded-xl bg-accent/5 border border-accent/20 space-y-3">
            <p className="text-[10px] font-black text-accent uppercase tracking-widest">
              Cargando: {selectedPrestacion.nombre}
            </p>
            <input
              placeholder="Resumen / observaciones (opcional)..."
              value={resumen}
              onChange={(e) => setResumen(e.target.value)}
              className="py-2! text-xs w-full"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSavePrestacion}
                disabled={saving}
                className="primary py-2! px-4! text-xs font-black"
              >
                {saving ? 'Guardando...' : '✓ Guardar Prestación'}
              </button>
              <button
                onClick={() => { setSelectedPrestacion(null); setResumen(''); }}
                className="secondary py-2! px-4! text-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Historial */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest">Historial del Caso</h3>
          <p className="text-[10px] text-accent animate-pulse">{status}</p>
        </div>

        <div className="tableWrap bg-black/40! overflow-x-auto">
          <table className="w-full min-w-[300px]">
            <thead>
              <tr><th>Prestación</th><th>Fecha</th><th>Resumen</th></tr>
            </thead>
            <tbody>
              {history.length > 0 ? history.map(h => (
                <tr key={h.id}>
                  <td className="font-bold text-white">{h.nombre_prestacion || 'S/D'}</td>
                  <td className="text-xs">{new Date(h.created_at).toLocaleDateString('es-AR')}</td>
                  <td className="text-xs max-w-[120px] truncate opacity-60">{h.resumen || '-'}</td>
                </tr>
              )) : (
                <tr><td colSpan="3" className="text-center py-8 text-muted/40 text-xs italic">Sin registros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default PrestacionesSection;