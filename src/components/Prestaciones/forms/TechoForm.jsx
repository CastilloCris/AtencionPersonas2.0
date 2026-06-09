import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { ArrowLeft, Save, Home, Plus, Trash2 } from 'lucide-react';

const UNIDADES = ['unidades', 'kg', 'metros', 'litros', 'bolsas', 'chapas', 'pares', 'rollos', 'cajas', 'otro'];

const TechoForm = ({ caseId, onBack, onClose, initialData, recordId, isEditing }) => {
  const [loading, setLoading] = useState(false);
  const [fecha_entrega, setFechaEntrega] = useState(
    initialData?.fecha_entrega ?? new Date().toISOString().split('T')[0]
  );
  const [observaciones, setObservaciones] = useState(initialData?.observaciones ?? '');
  const [items, setItems] = useState(() => {
    if (initialData?.items && Array.isArray(initialData.items) && initialData.items.length > 0) {
      return initialData.items.map((i, idx) => ({ id: idx + 1, nombre: i.nombre, cantidad: i.cantidad, unidad: i.unidad }));
    }
    return [{ id: Date.now(), nombre: '', cantidad: '', unidad: 'unidades' }];
  });

  // Si initialData cambia (poco probable pero seguro)
  useEffect(() => {
    if (initialData) {
      setFechaEntrega(initialData.fecha_entrega ?? new Date().toISOString().split('T')[0]);
      setObservaciones(initialData.observaciones ?? '');
      if (initialData.items && Array.isArray(initialData.items) && initialData.items.length > 0) {
        setItems(initialData.items.map((i, idx) => ({ id: idx + 1, nombre: i.nombre, cantidad: i.cantidad, unidad: i.unidad })));
      }
    }
  }, [initialData]);

  const addItem = () => {
    setItems(prev => [...prev, { id: Date.now(), nombre: '', cantidad: '', unidad: 'unidades' }]);
  };

  const removeItem = (id) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItem = (id, field, value) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validItems = items.filter(i => i.nombre.trim() && i.cantidad);
    if (validItems.length === 0) {
      alert('Agregá al menos un material con nombre y cantidad.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        fecha_entrega,
        observaciones: observaciones || null,
        items: validItems.map(i => ({
          nombre: i.nombre.trim(),
          cantidad: Number(i.cantidad),
          unidad: i.unidad,
        })),
      };

      let error;
      if (isEditing && recordId) {
        ({ error } = await supabase.from('as_construyendo_techo').update(payload).eq('id', recordId));
      } else {
        ({ error } = await supabase.from('as_construyendo_techo').insert({ case_id: caseId, ...payload }));
      }

      if (error) throw error;
      alert(isEditing ? 'Entrega actualizada correctamente.' : 'Entrega registrada correctamente.');
      onClose();
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalItems = items.filter(i => i.nombre.trim() && i.cantidad).length;

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-8 duration-300" style={{ minHeight: 0 }}>

      {/* Header */}
      <div className="p-8 border-b border-white/5 flex items-center gap-6 shrink-0">
        <button onClick={onBack} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Construyendo Techo</h2>
            <p className="text-[10px] uppercase font-black text-emerald-400 tracking-widest mt-1">
              {isEditing ? '✏ Editando registro' : 'Acción Social'}
            </p>
          </div>
        </div>
        {totalItems > 0 && (
          <div className="ml-auto flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2">
            <span className="text-xl font-black text-emerald-400">{totalItems}</span>
            <span className="text-[10px] text-emerald-400/70 uppercase tracking-widest">
              material{totalItems !== 1 ? 'es' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Cuerpo scrolleable */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar" style={{ minHeight: 0 }}>
        <div className="p-8 space-y-8">

          {/* Fecha y observaciones */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label>Fecha de Entrega</label>
              <input
                type="date"
                value={fecha_entrega}
                onChange={e => setFechaEntrega(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label>Observaciones generales</label>
              <input
                placeholder="Ej: Reparación techo habitación principal..."
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
              />
            </div>
          </div>

          {/* Materiales */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Materiales entregados</h3>
                <p className="text-[10px] text-muted mt-0.5">
                  Agregá todos los materiales sin límite. Podés usar cualquier nombre y unidad.
                </p>
              </div>
              <button type="button" onClick={addItem} className="secondary flex items-center gap-2 py-2! px-4! text-xs">
                <Plus className="w-3.5 h-3.5" /> Agregar material
              </button>
            </div>

            <div className="grid gap-3 px-1" style={{ gridTemplateColumns: '1fr 110px 130px 44px' }}>
              <p className="text-[10px] uppercase font-black text-muted tracking-widest">Material</p>
              <p className="text-[10px] uppercase font-black text-muted tracking-widest">Cantidad</p>
              <p className="text-[10px] uppercase font-black text-muted tracking-widest">Unidad</p>
              <div />
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={item.id}
                  className="grid gap-3 items-center p-3 rounded-xl bg-white/2 border border-white/5"
                  style={{ gridTemplateColumns: '1fr 110px 130px 44px' }}>
                  <input
                    placeholder="Ej: Chapas de zinc, Tirantes, Clavos..."
                    value={item.nombre}
                    onChange={e => updateItem(item.id, 'nombre', e.target.value)}
                    className="py-2! text-sm"
                    required={idx === 0}
                  />
                  <input
                    type="number" min="0" step="any" placeholder="0"
                    value={item.cantidad}
                    onChange={e => updateItem(item.id, 'cantidad', e.target.value)}
                    className="py-2! text-sm text-center"
                    required={idx === 0}
                  />
                  <select value={item.unidad} onChange={e => updateItem(item.id, 'unidad', e.target.value)} className="py-2! text-sm">
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <button type="button" onClick={() => removeItem(item.id)} disabled={items.length === 1}
                    className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/8 border border-red-500/15 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button type="button" onClick={addItem}
              className="w-full py-3 rounded-xl border border-dashed border-white/10 text-xs text-muted hover:border-accent/30 hover:text-accent transition-all flex items-center justify-center gap-2">
              <Plus className="w-3.5 h-3.5" /> Agregar otro material
            </button>
          </div>

          {/* Resumen */}
          {totalItems > 0 && (
            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 space-y-2">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Resumen de entrega</p>
              <div className="flex flex-wrap gap-2">
                {items.filter(i => i.nombre.trim() && i.cantidad).map(i => (
                  <span key={i.id} className="text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1 text-emerald-300">
                    {i.cantidad} {i.unidad} de {i.nombre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="pt-4 flex gap-4">
            <button type="submit" disabled={loading || totalItems === 0}
              className="primary flex-1 py-4! text-lg! flex items-center justify-center gap-3">
              <Save className="w-5 h-5" />
              {loading ? 'Guardando...' : isEditing ? '✓ Guardar Cambios' : 'Registrar Entrega'}
            </button>
            <button type="button" onClick={onBack} className="secondary px-10! py-4!">Volver</button>
          </div>

        </div>
      </form>
    </div>
  );
};

export default TechoForm;