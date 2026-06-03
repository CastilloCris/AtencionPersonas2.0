import { useCallback, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

// ─── Helpers ────────────────────────────────────────────────────────────────

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const hoy = new Date();
const MES_ACTUAL  = hoy.getMonth() + 1;
const ANIO_ACTUAL = hoy.getFullYear();

function fmtPrecio(p) {
  if (p == null) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(p);
}

function Avatar({ name }) {
  const initials = name
    ? name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?';
  return (
    <div className="w-9 h-9 rounded-xl bg-accent2/15 flex items-center justify-center text-accent text-xs font-bold shrink-0">
      {initials}
    </div>
  );
}

function Badge({ children, color = 'default' }) {
  const colors = {
    default: 'bg-accent2/12 text-accent border-accent/25',
    green:   'bg-teal-500/12 text-teal-400 border-teal-500/25',
    amber:   'bg-amber-500/12 text-amber-400 border-amber-500/25',
    red:     'bg-red-500/12 text-red-400 border-red-500/25',
    muted:   'bg-white/6 text-white/30 border-white/10',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

// ─── Modal: Agregar / Editar Paciente ───────────────────────────────────────

function PacienteModal({ paciente, onClose, onSaved }) {
  const esNuevo = !paciente?.id;
  const [form, setForm] = useState({
    nombre:      paciente?.nombre      || '',
    dni:         paciente?.dni         || '',
    cuit:        paciente?.cuit        || '',
    telefono:    paciente?.telefono    || '',
    beneficio:   paciente?.beneficio   || '',
    diagnosticos: paciente?.diagnosticos?.join(', ') || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [buscandoPerson, setBuscandoPerson] = useState(false);
  const [personEncontrada, setPersonEncontrada] = useState(null);

  const buscarEnPersons = async () => {
    if (!form.dni || form.dni.length < 7) return;
    setBuscandoPerson(true);
    const { data } = await supabase.from('persons').select('id, apellido_nombre, dni').eq('dni', form.dni).maybeSingle();
    setPersonEncontrada(data || null);
    if (data) setForm(f => ({ ...f, nombre: data.apellido_nombre }));
    setBuscandoPerson(false);
  };

  const handleSubmit = async () => {
    if (!form.nombre || !form.dni) { setError('Nombre y DNI son obligatorios.'); return; }
    setLoading(true);
    setError('');
    const payload = {
      nombre:       form.nombre.trim(),
      dni:          form.dni.trim(),
      cuit:         form.cuit.trim() || null,
      telefono:     form.telefono.trim() || null,
      beneficio:    form.beneficio.trim() || null,
      diagnosticos: form.diagnosticos ? form.diagnosticos.split(',').map(d => d.trim()).filter(Boolean) : [],
      person_id:    personEncontrada?.id ?? paciente?.person_id ?? null,
    };
    let error;
    if (esNuevo) {
      ({ error } = await supabase.from('farmacia_pacientes').insert(payload));
    } else {
      ({ error } = await supabase.from('farmacia_pacientes').update(payload).eq('id', paciente.id));
    }
    setLoading(false);
    if (error) { setError(error.message); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-lg border border-white/10 rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold text-sm">{esNuevo ? 'Nuevo paciente' : 'Editar paciente'}</h3>
          <button onClick={onClose} className="text-muted hover:text-white p-1 transition-colors">✕</button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label>DNI</label>
              <input value={form.dni} onChange={e => setForm(f => ({ ...f, dni: e.target.value.replace(/\D/g,'') }))} onBlur={buscarEnPersons} placeholder="Sin puntos" />
              {buscandoPerson && <p className="text-[10px] text-muted mt-1">Buscando...</p>}
              {personEncontrada && <p className="text-[10px] text-teal-400 mt-1">✓ Vinculado a: {personEncontrada.apellido_nombre}</p>}
            </div>
            <div>
              <label>Nombre completo</label>
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Apellido, Nombre" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label>CUIT</label><input value={form.cuit} onChange={e => setForm(f => ({ ...f, cuit: e.target.value }))} placeholder="20-00000000-0" /></div>
            <div><label>Teléfono</label><input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="3757-000000" /></div>
          </div>
          <div><label>Beneficio / Número de afiliado</label><input value={form.beneficio} onChange={e => setForm(f => ({ ...f, beneficio: e.target.value }))} placeholder="Número de beneficio" /></div>
          <div>
            <label>Diagnósticos (separados por coma)</label>
            <textarea value={form.diagnosticos} onChange={e => setForm(f => ({ ...f, diagnosticos: e.target.value }))} placeholder="HTA, DBT, Epilepsia..." rows={2} className="resize-none" />
          </div>
          {error && <p className="text-red-400 text-xs bg-red-500/8 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="secondary flex-1 py-2.5 text-sm">Cancelar</button>
            <button onClick={handleSubmit} disabled={loading} className="primary flex-1 py-2.5 text-sm disabled:opacity-50">
              {loading ? 'Guardando...' : esNuevo ? 'Crear paciente' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Gestión de Medicamentos (con búsqueda en catálogo) ──────────────

function MedicamentosModal({ paciente, onClose }) {
  const [medicamentos, setMedicamentos] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [guardando, setGuardando] = useState(false);
  // Búsqueda en catálogo
  const [busqueda, setBusqueda]         = useState('');
  const [resultados, setResultados]     = useState([]);
  const [buscando, setBuscando]         = useState(false);
  const [selCatalogo, setSelCatalogo]   = useState(null); // item del catálogo seleccionado
  // Campos extra manuales
  const [dosis, setDosis]     = useState('');
  const [medida, setMedida]   = useState('');
  const [cantidad, setCantidad] = useState('');
  const timerRef = useRef(null);

  const fetchMeds = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('farmacia_medicamentos').select('*').eq('paciente_id', paciente.id).eq('activo', true).order('created_at');
    setMedicamentos(data || []);
    setLoading(false);
  }, [paciente.id]);

  useEffect(() => { fetchMeds(); }, [fetchMeds]);

  // Búsqueda con debounce
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!busqueda || busqueda.length < 2) { setResultados([]); return; }
    timerRef.current = setTimeout(async () => {
      setBuscando(true);
      const { data } = await supabase
        .from('farmacia_catalogo_con_precio')
        .select('*')
        .eq('activo', true)
        .or(`nombre.ilike.%${busqueda}%,droga.ilike.%${busqueda}%`)
        .order('nombre')
        .limit(8);
      setResultados(data || []);
      setBuscando(false);
    }, 300);
  }, [busqueda]);

  const handleSeleccionarCatalogo = (item) => {
    setSelCatalogo(item);
    setBusqueda(item.nombre);
    setResultados([]);
  };

  const handleAdd = async () => {
    if (!selCatalogo) return;
    setGuardando(true);
    await supabase.from('farmacia_medicamentos').insert({
      paciente_id:  paciente.id,
      medicamento:  selCatalogo.nombre,
      droga:        selCatalogo.droga || '',
      dosis,
      medida,
      cantidad:     cantidad || null,
      unidad:       selCatalogo.unidad || '',
      catalogo_id:  selCatalogo.id,
    });
    setSelCatalogo(null);
    setBusqueda('');
    setDosis(''); setMedida(''); setCantidad('');
    await fetchMeds();
    setGuardando(false);
  };

  const handleDelete = async (id) => {
    await supabase.from('farmacia_medicamentos').update({ activo: false }).eq('id', id);
    setMedicamentos(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-2xl border border-white/10 rounded-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h3 className="text-white font-semibold text-sm">Medicamentos asignados</h3>
            <p className="text-muted text-xs mt-0.5">{paciente.nombre} — DNI {paciente.dni}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white p-1 transition-colors">✕</button>
        </div>

        {/* Lista asignados */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {loading ? (
            <p className="text-muted text-xs text-center py-6">Cargando...</p>
          ) : medicamentos.length === 0 ? (
            <p className="text-muted text-xs text-center py-6">Sin medicamentos asignados aún</p>
          ) : (
            medicamentos.map(m => (
              <div key={m.id} className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-xl bg-white/4 border border-white/8">
                <div className="min-w-0">
                  <p className="text-white text-xs font-medium truncate">{m.medicamento}</p>
                  <p className="text-muted text-[10px] mt-0.5">
                    {[m.droga, m.dosis && `${m.dosis} ${m.medida}`, m.cantidad && `${m.cantidad} ${m.unidad}`].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button onClick={() => handleDelete(m.id)} className="text-white/20 hover:text-red-400 transition-colors text-xs shrink-0 mt-0.5">✕</button>
              </div>
            ))
          )}
        </div>

        {/* Agregar desde catálogo */}
        <div className="border-t border-white/8 pt-4 shrink-0">
          <p className="text-[10px] text-muted uppercase tracking-widest mb-3">Agregar desde catálogo</p>
          <div className="relative mb-3">
            <label>Buscar medicamento</label>
            <input
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setSelCatalogo(null); }}
              placeholder="Escribí el nombre o la droga..."
            />
            {buscando && <p className="text-[10px] text-muted mt-1">Buscando...</p>}
            {resultados.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-panel border border-white/10 rounded-xl overflow-hidden shadow-xl">
                {resultados.map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleSeleccionarCatalogo(r)}
                    className="w-full text-left px-4 py-2.5 hover:bg-accent2/10 transition-colors border-b border-white/5 last:border-0"
                  >
                    <p className="text-white text-xs font-medium">{r.nombre}</p>
                    <p className="text-muted text-[10px]">
                      {r.droga || '—'} · {r.unidad}
                      {r.precio_vigente != null && <span className="text-accent ml-2">{fmtPrecio(r.precio_vigente)}</span>}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selCatalogo && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-accent2/8 border border-accent/20 flex items-center gap-2">
              <span className="text-accent text-xs">✓</span>
              <span className="text-white text-xs flex-1 truncate">{selCatalogo.nombre}</span>
              <span className="text-muted text-[10px]">{selCatalogo.unidad}</span>
              {selCatalogo.precio_vigente != null && <span className="text-accent text-[10px] font-mono">{fmtPrecio(selCatalogo.precio_vigente)}</span>}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div><label>Dosis</label><input value={dosis} onChange={e => setDosis(e.target.value)} placeholder="500" /></div>
            <div><label>Medida</label><input value={medida} onChange={e => setMedida(e.target.value)} placeholder="Mg" /></div>
            <div><label>Cantidad mensual</label><input type="number" value={cantidad} onChange={e => setCantidad(e.target.value)} placeholder="30" /></div>
          </div>

          <button onClick={handleAdd} disabled={guardando || !selCatalogo} className="primary w-full py-2.5 text-sm disabled:opacity-50">
            {guardando ? 'Guardando...' : '+ Agregar medicamento'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Registrar Entrega ────────────────────────────────────────────────

function EntregaModal({ paciente, mes, anio, onClose, onSaved }) {
  const [medicamentos, setMedicamentos] = useState([]);
  const [seleccionados, setSeleccionados] = useState({});
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading]   = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: meds } = await supabase.from('farmacia_medicamentos').select('*').eq('paciente_id', paciente.id).eq('activo', true);
      setMedicamentos(meds || []);
      const sel = {};
      (meds || []).forEach(m => { sel[m.id] = { checked: true, cantidad: m.cantidad || '' }; });
      setSeleccionados(sel);
      setLoading(false);
    };
    fetchData();
  }, [paciente.id]);

  const toggleMed = (id) => setSeleccionados(prev => ({ ...prev, [id]: { ...prev[id], checked: !prev[id]?.checked } }));
  const setCantidad = (id, cantidad) => setSeleccionados(prev => ({ ...prev, [id]: { ...prev[id], cantidad } }));

  const handleConfirm = async () => {
    const itemsSeleccionados = medicamentos.filter(m => seleccionados[m.id]?.checked);
    if (itemsSeleccionados.length === 0) { setError('Seleccioná al menos un medicamento.'); return; }
    setGuardando(true); setError('');
    const { data: entrega, error: errEntrega } = await supabase
      .from('farmacia_entregas')
      .upsert({ paciente_id: paciente.id, mes, anio, observaciones: observaciones || null, fecha_entrega: new Date().toISOString().split('T')[0] }, { onConflict: 'paciente_id,mes,anio' })
      .select('id').single();
    if (errEntrega) { setError(errEntrega.message); setGuardando(false); return; }
    await supabase.from('farmacia_entrega_items').delete().eq('entrega_id', entrega.id);
    const items = itemsSeleccionados.map(m => ({
      entrega_id: entrega.id, medicamento_id: m.id, medicamento_nombre: m.medicamento,
      cantidad_entregada: seleccionados[m.id]?.cantidad || m.cantidad || null, unidad: m.unidad || null,
    }));
    const { error: errItems } = await supabase.from('farmacia_entrega_items').insert(items);
    if (errItems) { setError(errItems.message); setGuardando(false); return; }
    setGuardando(false); onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-lg border border-white/10 rounded-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h3 className="text-white font-semibold text-sm">Registrar entrega</h3>
            <p className="text-muted text-xs mt-0.5">{paciente.nombre} · {MESES[mes - 1]} {anio}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white p-1 transition-colors">✕</button>
        </div>
        {loading ? (
          <p className="text-muted text-xs text-center py-8">Cargando medicamentos...</p>
        ) : medicamentos.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-white/60 text-sm">Este paciente no tiene medicamentos asignados.</p>
            <p className="text-muted text-xs mt-1">Primero asigná medicamentos desde el padrón.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2 mb-4">
            {medicamentos.map(m => (
              <div key={m.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${seleccionados[m.id]?.checked ? 'bg-accent2/10 border-accent/25' : 'bg-white/3 border-white/8 opacity-50'}`} onClick={() => toggleMed(m.id)}>
                <div className={`w-4 h-4 rounded-md border shrink-0 flex items-center justify-center transition-all ${seleccionados[m.id]?.checked ? 'bg-accent2 border-accent2' : 'border-white/20'}`}>
                  {seleccionados[m.id]?.checked && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <div className="flex-1 min-w-0"><p className="text-white text-xs font-medium truncate">{m.medicamento}</p></div>
                {seleccionados[m.id]?.checked && (
                  <input type="number" value={seleccionados[m.id]?.cantidad || ''} onChange={e => { e.stopPropagation(); setCantidad(m.id, e.target.value); }} onClick={e => e.stopPropagation()} placeholder="Cant." className="w-16 py-1 px-2 text-xs text-center" />
                )}
              </div>
            ))}
          </div>
        )}
        <div className="border-t border-white/8 pt-4 shrink-0 space-y-3">
          <div><label>Observaciones (opcional)</label><textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} className="resize-none" placeholder="Notas sobre la entrega..." /></div>
          {error && <p className="text-red-400 text-xs bg-red-500/8 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="secondary flex-1 py-2.5 text-sm">Cancelar</button>
            <button onClick={handleConfirm} disabled={guardando || medicamentos.length === 0} className="primary flex-1 py-2.5 text-sm disabled:opacity-50">
              {guardando ? 'Guardando...' : '✓ Confirmar entrega'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Agregar / Editar ítem del Catálogo ──────────────────────────────

function CatalogoItemModal({ item, onClose, onSaved }) {
  const esNuevo = !item?.id;
  const [form, setForm] = useState({
    nombre:      item?.nombre      || '',
    droga:       item?.droga       || '',
    descripcion: item?.descripcion || '',
    unidad:      item?.unidad      || 'comprimido',
  });
  const [precio, setPrecio]   = useState(item?.precio_vigente ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async () => {
    if (!form.nombre) { setError('El nombre es obligatorio.'); return; }
    setLoading(true); setError('');

    let medId = item?.id;
    if (esNuevo) {
      const { data, error: e } = await supabase.from('farmacia_catalogo').insert({ ...form }).select('id').single();
      if (e) { setError(e.message); setLoading(false); return; }
      medId = data.id;
    } else {
      const { error: e } = await supabase.from('farmacia_catalogo').update({ ...form }).eq('id', item.id);
      if (e) { setError(e.message); setLoading(false); return; }
    }

    // Guardar precio si se ingresó
    if (precio !== '' && precio != null) {
      const { error: ep } = await supabase.from('farmacia_precios').insert({
        medicamento_id: medId,
        precio: parseFloat(precio),
        vigente_desde: new Date().toISOString().split('T')[0],
      });
      if (ep) { setError('Medicamento guardado, pero error al guardar precio: ' + ep.message); setLoading(false); return; }
    }

    setLoading(false);
    onSaved();
  };

  const UNIDADES = ['comprimido', 'frasco', 'ampolla', 'sobre', 'ml', 'unidad', 'caja', 'blister', 'jeringa'];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-lg border border-white/10 rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold text-sm">{esNuevo ? 'Agregar al catálogo' : 'Editar medicamento'}</h3>
          <button onClick={onClose} className="text-muted hover:text-white p-1 transition-colors">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label>Nombre del medicamento *</label>
            <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Divalproato de sodio 500 Mg x 50 Comp." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label>Droga / Principio activo</label>
              <input value={form.droga} onChange={e => setForm(f => ({ ...f, droga: e.target.value }))} placeholder="Divalproato de sodio" />
            </div>
            <div>
              <label>Unidad</label>
              <select value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label>Descripción (opcional)</label>
            <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={2} className="resize-none" placeholder="Indicaciones, presentación, etc." />
          </div>
          <div className="border-t border-white/8 pt-4">
            <label>Precio vigente (ARS)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={precio}
                onChange={e => setPrecio(e.target.value)}
                placeholder="0.00"
                className="pl-7"
              />
            </div>
            <p className="text-[10px] text-muted mt-1 ml-1">
              {esNuevo ? 'Podés agregar el precio ahora o más tarde desde el catálogo.' : 'Ingresá un valor para registrar un nuevo precio en el historial.'}
            </p>
          </div>
          {error && <p className="text-red-400 text-xs bg-red-500/8 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="secondary flex-1 py-2.5 text-sm">Cancelar</button>
            <button onClick={handleSubmit} disabled={loading} className="primary flex-1 py-2.5 text-sm disabled:opacity-50">
              {loading ? 'Guardando...' : esNuevo ? 'Agregar al catálogo' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Historial de precios ─────────────────────────────────────────────

function HistorialPreciosModal({ item, onClose }) {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('farmacia_precios')
        .select('*')
        .eq('medicamento_id', item.id)
        .order('vigente_desde', { ascending: false });
      setHistorial(data || []);
      setLoading(false);
    };
    fetch();
  }, [item.id]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md border border-white/10 rounded-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h3 className="text-white font-semibold text-sm">Historial de precios</h3>
            <p className="text-muted text-xs mt-0.5 truncate max-w-xs">{item.nombre}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white p-1 transition-colors">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-muted text-xs text-center py-8">Cargando...</p>
          ) : historial.length === 0 ? (
            <p className="text-muted text-xs text-center py-8">Sin historial de precios registrado</p>
          ) : (
            <div className="space-y-2">
              {historial.map((h, i) => (
                <div key={h.id} className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${i === 0 ? 'bg-accent2/10 border border-accent/20' : 'bg-white/3 border border-white/8'}`}>
                  <div>
                    <p className="text-white text-xs font-mono font-semibold">{fmtPrecio(h.precio)}</p>
                    <p className="text-muted text-[10px] mt-0.5">Desde {h.vigente_desde}</p>
                    {h.observaciones && <p className="text-white/30 text-[10px]">{h.observaciones}</p>}
                  </div>
                  {i === 0 && <span className="text-[10px] text-accent bg-accent2/10 border border-accent/20 px-2 py-0.5 rounded-full">Vigente</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="pt-4 shrink-0">
          <button onClick={onClose} className="secondary w-full py-2.5 text-sm">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Vista: Catálogo de Medicamentos ────────────────────────────────────────

function VistaCatalogo() {
  const [catalogo, setCatalogo]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [busqueda, setBusqueda]         = useState('');
  const [modalItem, setModalItem]       = useState(null); // null | 'nuevo' | item
  const [modalHistorial, setModalHistorial] = useState(null);
  const [modalPrecio, setModalPrecio]   = useState(null); // item para actualizar precio

  const fetchCatalogo = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('farmacia_catalogo_con_precio')
      .select('*')
      .order('nombre');
    setCatalogo(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCatalogo(); }, [fetchCatalogo]);

  const handleToggleActivo = async (item) => {
    await supabase.from('farmacia_catalogo').update({ activo: !item.activo }).eq('id', item.id);
    setCatalogo(prev => prev.map(c => c.id === item.id ? { ...c, activo: !item.activo } : c));
  };

  const filtrados = catalogo.filter(c =>
    !busqueda ||
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.droga?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const conPrecio    = catalogo.filter(c => c.precio_vigente != null).length;
  const sinPrecio    = catalogo.filter(c => c.precio_vigente == null).length;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre o droga..." className="flex-1 py-2.5" />
        <button onClick={() => setModalItem('nuevo')} className="primary px-5 py-2.5 text-sm shrink-0">
          + Agregar medicamento
        </button>
      </div>

      {/* Métricas rápidas */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-xs text-muted">{catalogo.length} medicamentos en catálogo</span>
        <span className="text-muted/30">·</span>
        <span className="text-xs text-teal-400">{conPrecio} con precio</span>
        <span className="text-muted/30">·</span>
        <span className="text-xs text-amber-400">{sinPrecio} sin precio</span>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-muted text-xs opacity-50">Cargando catálogo...</div>
      ) : filtrados.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-white/60 text-sm">No se encontraron medicamentos</p>
          <p className="text-muted text-xs mt-1">Intentá con otro término o agregá uno nuevo</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {filtrados.map(c => (
            <div key={c.id} className={`card py-3 px-4 flex items-center gap-4 transition-all ${!c.activo ? 'opacity-40' : ''}`}>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white text-sm font-medium truncate">{c.nombre}</p>
                  {!c.activo && <Badge color="muted">Inactivo</Badge>}
                </div>
                <p className="text-muted text-xs mt-0.5">
                  {c.droga || 'Sin droga'} · <span className="text-white/40">{c.unidad}</span>
                  {c.descripcion && <span className="text-white/25"> · {c.descripcion}</span>}
                </p>
              </div>

              {/* Precio */}
              <div className="text-right shrink-0 hidden sm:block">
                {c.precio_vigente != null ? (
                  <p className="text-accent text-sm font-mono font-semibold">{fmtPrecio(c.precio_vigente)}</p>
                ) : (
                  <p className="text-amber-400/60 text-xs">Sin precio</p>
                )}
                {c.precio_desde && <p className="text-muted text-[10px]">desde {c.precio_desde}</p>}
              </div>

              {/* Acciones */}
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => setModalHistorial(c)}
                  className="secondary py-1.5 px-2.5 text-xs"
                  title="Ver historial de precios"
                >
                  📈
                </button>
                <button
                  onClick={() => setModalItem(c)}
                  className="secondary py-1.5 px-2.5 text-xs"
                  title="Editar"
                >
                  ✎
                </button>
                <button
                  onClick={() => handleToggleActivo(c)}
                  className={`py-1.5 px-2.5 text-xs rounded-xl border transition-all ${c.activo ? 'bg-white/4 border-white/8 text-white/30 hover:text-red-400 hover:border-red-500/20' : 'bg-teal-500/8 border-teal-500/20 text-teal-400 hover:bg-teal-500/15'}`}
                  title={c.activo ? 'Desactivar' : 'Activar'}
                >
                  {c.activo ? '⏸' : '▶'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modales */}
      {modalItem && (
        <CatalogoItemModal
          item={modalItem === 'nuevo' ? null : modalItem}
          onClose={() => setModalItem(null)}
          onSaved={() => { setModalItem(null); fetchCatalogo(); }}
        />
      )}
      {modalHistorial && (
        <HistorialPreciosModal item={modalHistorial} onClose={() => setModalHistorial(null)} />
      )}
    </div>
  );
}

// ─── Vista: Padrón ───────────────────────────────────────────────────────────

function VistaPatron({ mesFiltro, anioFiltro }) {
  const [pacientes, setPacientes]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [busqueda, setBusqueda]           = useState('');
  const [modalPaciente, setModalPaciente] = useState(null);
  const [modalMeds, setModalMeds]         = useState(null);
  const [modalEntrega, setModalEntrega]   = useState(null);
  const [entregasDelMes, setEntregasDelMes] = useState(new Set());

  const fetchPacientes = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('farmacia_pacientes').select('*, medicamentos:farmacia_medicamentos(id, medicamento, activo)').eq('activo', true).order('nombre');
    setPacientes(data || []);
    setLoading(false);
  }, []);

  const fetchEntregasDelMes = useCallback(async () => {
    const { data } = await supabase.from('farmacia_entregas').select('paciente_id').eq('mes', mesFiltro).eq('anio', anioFiltro);
    setEntregasDelMes(new Set((data || []).map(e => e.paciente_id)));
  }, [mesFiltro, anioFiltro]);

  useEffect(() => { fetchPacientes(); fetchEntregasDelMes(); }, [fetchPacientes, fetchEntregasDelMes]);

  const pacientesFiltrados = pacientes.filter(p =>
    !busqueda || p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || p.dni?.includes(busqueda)
  );
  const medsActivos = (p) => (p.medicamentos || []).filter(m => m.activo);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre o DNI..." className="flex-1 py-2.5" />
        <button onClick={() => setModalPaciente('nuevo')} className="primary px-5 py-2.5 text-sm shrink-0">+ Nuevo paciente</button>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted">{pacientesFiltrados.length} pacientes</span>
        <span className="text-muted/30">·</span>
        <span className="text-xs text-teal-400">{entregasDelMes.size} con entrega en {MESES[mesFiltro - 1]}</span>
        <span className="text-muted/30">·</span>
        <span className="text-xs text-amber-400">{pacientesFiltrados.length - entregasDelMes.size} pendientes</span>
      </div>
      {loading ? (
        <div className="text-center py-16 text-muted text-xs opacity-50">Cargando padrón...</div>
      ) : pacientesFiltrados.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-white/60 text-sm">No se encontraron pacientes</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {pacientesFiltrados.map(p => {
            const tieneEntrega = entregasDelMes.has(p.id);
            const meds = medsActivos(p);
            return (
              <div key={p.id} className={`card border-l-2 py-4 px-5 transition-all ${tieneEntrega ? 'border-l-teal-500/60' : 'border-l-white/10'}`}>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar name={p.nombre} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-medium text-sm">{p.nombre}</p>
                        {tieneEntrega ? <Badge color="green">✓ Entregado</Badge> : <Badge color="amber">Pendiente</Badge>}
                      </div>
                      <p className="text-muted text-xs font-mono mt-0.5">DNI {p.dni}{p.telefono ? ` · ${p.telefono}` : ''}</p>
                      {p.diagnosticos?.length > 0 && <p className="text-white/40 text-xs mt-1 line-clamp-1">{p.diagnosticos.join(' · ')}</p>}
                      <p className="text-white/30 text-[10px] mt-1">{meds.length} medicamento{meds.length !== 1 ? 's' : ''} asignado{meds.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap md:flex-nowrap shrink-0">
                    <button onClick={() => setModalMeds(p)} className="secondary py-2 px-3 text-xs">Medicamentos</button>
                    <button onClick={() => setModalPaciente(p)} className="secondary py-2 px-3 text-xs">Editar</button>
                    <button onClick={() => setModalEntrega(p)} className={`py-2 px-3 text-xs rounded-xl border transition-all ${tieneEntrega ? 'bg-teal-500/10 border-teal-500/25 text-teal-400 hover:bg-teal-500/20' : 'primary'}`}>
                      {tieneEntrega ? '↺ Re-registrar' : '+ Entrega'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {modalPaciente && <PacienteModal paciente={modalPaciente === 'nuevo' ? null : modalPaciente} onClose={() => setModalPaciente(null)} onSaved={() => { setModalPaciente(null); fetchPacientes(); }} />}
      {modalMeds && <MedicamentosModal paciente={modalMeds} onClose={() => { setModalMeds(null); fetchPacientes(); }} />}
      {modalEntrega && <EntregaModal paciente={modalEntrega} mes={mesFiltro} anio={anioFiltro} onClose={() => setModalEntrega(null)} onSaved={() => { setModalEntrega(null); fetchEntregasDelMes(); fetchPacientes(); }} />}
    </div>
  );
}

// ─── Vista: Historial de Entregas ────────────────────────────────────────────

function VistaHistorial({ mesFiltro, anioFiltro }) {
  const [entregas, setEntregas]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [expandido, setExpandido] = useState(null);
  const [items, setItems]         = useState({});

  const fetchEntregas = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('farmacia_entregas').select('*, paciente:farmacia_pacientes(nombre, dni)').eq('mes', mesFiltro).eq('anio', anioFiltro).order('created_at', { ascending: false });
    setEntregas(data || []);
    setLoading(false);
  }, [mesFiltro, anioFiltro]);

  useEffect(() => { fetchEntregas(); }, [fetchEntregas]);

  const fetchItems = async (entregaId) => {
    if (items[entregaId]) { setExpandido(entregaId); return; }
    const { data } = await supabase.from('farmacia_entrega_items').select('*').eq('entrega_id', entregaId);
    setItems(prev => ({ ...prev, [entregaId]: data || [] }));
    setExpandido(entregaId);
  };

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar esta entrega?')) return;
    await supabase.from('farmacia_entregas').delete().eq('id', id);
    setEntregas(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="text-center py-16 text-muted text-xs opacity-50">Cargando historial...</div>
      ) : entregas.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-white/60 text-sm">Sin entregas registradas</p>
          <p className="text-muted text-xs mt-1">No hay entregas en {MESES[mesFiltro - 1]} {anioFiltro}</p>
        </div>
      ) : (
        entregas.map(e => (
          <div key={e.id} className="card py-3 px-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={e.paciente?.nombre} />
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{e.paciente?.nombre}</p>
                  <p className="text-muted text-xs">DNI {e.paciente?.dni} · {e.fecha_entrega}</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => expandido === e.id ? setExpandido(null) : fetchItems(e.id)} className="secondary py-1.5 px-3 text-xs">{expandido === e.id ? 'Cerrar' : 'Ver detalle'}</button>
                <button onClick={() => handleEliminar(e.id)} className="danger py-1.5 px-3 text-xs">Eliminar</button>
              </div>
            </div>
            {expandido === e.id && items[e.id] && (
              <div className="mt-3 pt-3 border-t border-white/8 space-y-1.5">
                {items[e.id].map(item => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <span className="text-white/70">{item.medicamento_nombre}</span>
                    <span className="text-muted font-mono">{item.cantidad_entregada} {item.unidad}</span>
                  </div>
                ))}
                {e.observaciones && <p className="text-white/30 text-xs pt-2 border-t border-white/5 mt-2">{e.observaciones}</p>}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ─── Vista: Resumen Mensual ──────────────────────────────────────────────────

function VistaResumen({ mesFiltro, anioFiltro }) {
  const [resumen, setResumen] = useState({ entregas: [], sinEntrega: [] });
  const [loading, setLoading] = useState(true);
  const printRef = useRef(null);

  const fetchResumen = useCallback(async () => {
    setLoading(true);

    const { data: entregas } = await supabase
      .from('farmacia_entregas')
      .select(`
        id, observaciones, fecha_entrega,
        paciente:farmacia_pacientes(nombre, dni),
        items:farmacia_entrega_items(
          id, medicamento_nombre, cantidad_entregada, unidad, medicamento_id,
          med:farmacia_medicamentos!medicamento_id(catalogo_id)
        )
      `)
      .eq('mes', mesFiltro)
      .eq('anio', anioFiltro)
      .order('created_at');

    const catalogoIds = [...new Set(
      (entregas || [])
        .flatMap(e => e.items || [])
        .map(i => i.med?.catalogo_id)
        .filter(Boolean)
    )];

    let preciosPorCatalogo = {};
    if (catalogoIds.length > 0) {
      const { data: precios } = await supabase
        .from('farmacia_catalogo_con_precio')
        .select('id, precio_vigente')
        .in('id', catalogoIds);
      (precios || []).forEach(p => { preciosPorCatalogo[p.id] = p.precio_vigente ?? 0; });
    }

    const entregasEnriquecidas = (entregas || []).map(e => ({
      ...e,
      items: (e.items || []).map(item => ({
        ...item,
        precio_vigente: item.med?.catalogo_id ? (preciosPorCatalogo[item.med.catalogo_id] ?? null) : null,
      })),
    }));

    const { data: todos } = await supabase.from('farmacia_pacientes').select('id, nombre, dni').eq('activo', true).order('nombre');
    const idsConEntrega = new Set((entregas || []).map(e => e.paciente?.dni));
    setResumen({ entregas: entregasEnriquecidas, sinEntrega: (todos || []).filter(p => !idsConEntrega.has(p.dni)) });
    setLoading(false);
  }, [mesFiltro, anioFiltro]);

  useEffect(() => { fetchResumen(); }, [fetchResumen]);

  const handlePrint = () => {
    const contenido = printRef.current.innerHTML;
    const ventana = window.open('', '_blank');
    ventana.document.write(`<html><head><title>Resumen Farmacia ${MESES[mesFiltro - 1]} ${anioFiltro}</title><style>body{font-family:Arial,sans-serif;font-size:11px;color:#000;padding:20px}h1{font-size:14px;font-weight:bold;margin-bottom:4px}h2{font-size:11px;color:#666;margin-bottom:16px;font-weight:normal}table{width:100%;border-collapse:collapse;margin-bottom:20px}th{background:#f0f0f0;border:1px solid #ccc;padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase}td{border:1px solid #ddd;padding:6px 8px;vertical-align:top}tr:nth-child(even) td{background:#fafafa}tfoot td{font-weight:bold;background:#e8e8e8}.sin-entrega{color:#999;font-style:italic}@media print{body{padding:0}}</style></head><body>${contenido}</body></html>`);
    ventana.document.close();
    ventana.print();
  };

  if (loading) return <div className="text-center py-16 text-muted text-xs opacity-50">Generando resumen...</div>;

  const { entregas, sinEntrega } = resumen;

  const totalMes = entregas.reduce((sum, e) =>
    sum + (e.items || []).reduce((s, item) =>
      item.precio_vigente != null ? s + item.precio_vigente * (parseFloat(item.cantidad_entregada) || 1) : s, 0), 0);

  const hayPrecios = entregas.some(e => (e.items || []).some(i => i.precio_vigente != null));

  const totalPorEntrega = (e) => (e.items || []).reduce((s, item) =>
    item.precio_vigente != null ? s + item.precio_vigente * (parseFloat(item.cantidad_entregada) || 1) : s, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-white text-sm font-medium">{entregas.length} entregas registradas · {sinEntrega?.length || 0} pendientes</p>
          <p className="text-muted text-xs mt-0.5">{MESES[mesFiltro - 1]} {anioFiltro}</p>
        </div>
        <button onClick={handlePrint} className="primary py-2.5 px-5 text-sm">🖨 Imprimir / Exportar</button>
      </div>

      {hayPrecios && (
        <div className="card border border-accent/20 bg-accent2/5 flex items-center justify-between gap-4 py-4 px-5">
          <div>
            <p className="text-xs text-muted uppercase tracking-widest mb-1">Total medicamentos entregados</p>
            <p className="text-2xl font-bold text-accent font-mono">{fmtPrecio(totalMes)}</p>
            <p className="text-[10px] text-muted mt-1">{MESES[mesFiltro - 1]} {anioFiltro} · {entregas.length} pacientes</p>
          </div>
          <div className="text-4xl opacity-20">💊</div>
        </div>
      )}

      <div ref={printRef}>
        <h1>RECETAS POR CARPETA {MESES[mesFiltro - 1].toUpperCase()} {anioFiltro} — MUNICIPALIDAD</h1>
        <h2>Farmacia Municipal · Entregas del mes</h2>
        <table>
          <thead>
            <tr>
              <th style={{width:'3%'}}>N°</th>
              <th style={{width:'20%'}}>Apellido y Nombre</th>
              <th style={{width:'10%'}}>DNI</th>
              <th style={{width: hayPrecios ? '42%' : '55%'}}>Medicamentos</th>
              <th style={{width:'13%'}}>Observaciones</th>
              {hayPrecios && <th style={{width:'12%',textAlign:'right'}}>Total</th>}
            </tr>
          </thead>
          <tbody>
            {entregas.map((e, i) => {
              const tot = totalPorEntrega(e);
              return (
                <tr key={e.id}>
                  <td>{i + 1}</td>
                  <td>{e.paciente?.nombre}</td>
                  <td>{e.paciente?.dni}</td>
                  <td>{(e.items || []).map(item => `${item.medicamento_nombre}${item.cantidad_entregada ? ` (${item.cantidad_entregada} ${item.unidad || ''})` : ''}`).join(', ')}</td>
                  <td>{e.observaciones || ''}</td>
                  {hayPrecios && <td style={{textAlign:'right',fontWeight:'bold'}}>{tot > 0 ? fmtPrecio(tot) : '—'}</td>}
                </tr>
              );
            })}
          </tbody>
          {hayPrecios && (
            <tfoot>
              <tr>
                <td colSpan={5} style={{textAlign:'right'}}>TOTAL DEL MES</td>
                <td style={{textAlign:'right'}}>{fmtPrecio(totalMes)}</td>
              </tr>
            </tfoot>
          )}
        </table>
        {sinEntrega?.length > 0 && (
          <><h2 style={{marginTop:'20px',color:'#999'}}>Pacientes sin entrega registrada este mes ({sinEntrega.length})</h2>
          <table><thead><tr><th>Apellido y Nombre</th><th>DNI</th></tr></thead>
          <tbody>{sinEntrega.map(p => <tr key={p.id}><td className="sin-entrega">{p.nombre}</td><td className="sin-entrega">{p.dni}</td></tr>)}</tbody></table></>
        )}
      </div>

      <div className="tableWrap overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>N°</th><th>Paciente</th><th>DNI</th><th>Medicamentos entregados</th><th>Obs.</th>
              {hayPrecios && <th className="text-right">Total</th>}
            </tr>
          </thead>
          <tbody>
            {entregas.map((e, i) => {
              const tot = totalPorEntrega(e);
              return (
                <tr key={e.id}>
                  <td className="text-muted font-mono text-xs">{i + 1}</td>
                  <td className="text-white text-sm font-medium">{e.paciente?.nombre}</td>
                  <td className="text-muted font-mono text-xs">{e.paciente?.dni}</td>
                  <td className="text-white/60 text-xs">{(e.items || []).map(item => item.medicamento_nombre).join(', ')}</td>
                  <td className="text-muted text-xs">{e.observaciones || '—'}</td>
                  {hayPrecios && (
                    <td className="text-right">
                      {tot > 0 ? <span className="text-accent text-xs font-mono font-semibold">{fmtPrecio(tot)}</span> : <span className="text-white/20 text-xs">—</span>}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          {hayPrecios && (
            <tfoot>
              <tr className="border-t-2 border-accent/20">
                <td colSpan={5} className="text-right text-xs font-semibold text-white/60 pt-3">Total del mes</td>
                <td className="text-right pt-3"><span className="text-accent font-mono font-bold text-sm">{fmtPrecio(totalMes)}</span></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {sinEntrega?.length > 0 && (
        <div className="card border border-amber-500/15">
          <p className="text-amber-400 text-xs font-medium mb-3">⚠ Sin entrega registrada este mes ({sinEntrega.length})</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {sinEntrega.map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50 shrink-0" />
                <span className="text-white/50 text-xs truncate">{p.nombre}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente Principal ────────────────────────────────────────────────────

export default function DashboardFarmacia({ profile }) {
  const [vista, setVista]     = useState('patron');
  const [mesFiltro, setMes]   = useState(MES_ACTUAL);
  const [anioFiltro, setAnio] = useState(ANIO_ACTUAL);

  const tabs = [
    { id: 'patron',    label: 'Padrón' },
    { id: 'catalogo',  label: 'Catálogo de medicamentos' },
    { id: 'historial', label: 'Historial' },
    { id: 'resumen',   label: 'Resumen mensual' },
  ];

  const showMesFiltro = vista !== 'catalogo';

  return (
    <section className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent2/15 border border-accent/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Farmacia Municipal</h2>
            <p className="text-xs text-muted mt-0.5">Padrón de pacientes crónicos y entregas mensuales</p>
          </div>
        </div>
        {showMesFiltro && (
          <div className="flex items-center gap-2">
            <select value={mesFiltro} onChange={e => setMes(Number(e.target.value))} className="py-2 text-sm w-36">
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <input type="number" value={anioFiltro} onChange={e => setAnio(Number(e.target.value))} className="py-2 text-sm w-24 text-center" min={2020} max={2099} />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/4 border border-white/8 w-fit flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setVista(t.id)}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${vista === t.id ? 'bg-accent2/20 text-accent border border-accent/25' : 'text-muted hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {vista === 'patron'    && <VistaPatron    mesFiltro={mesFiltro} anioFiltro={anioFiltro} />}
      {vista === 'catalogo'  && <VistaCatalogo />}
      {vista === 'historial' && <VistaHistorial mesFiltro={mesFiltro} anioFiltro={anioFiltro} />}
      {vista === 'resumen'   && <VistaResumen   mesFiltro={mesFiltro} anioFiltro={anioFiltro} />}
    </section>
  );
}
