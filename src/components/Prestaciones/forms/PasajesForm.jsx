import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { ArrowLeft, Save, Ticket, Plus, Trash2 } from 'lucide-react';
import { hoyLocal } from '../../../lib/fechas';

const PasajesForm = ({ caseId, onBack, onClose, initialData, recordId, isEditing }) => {
  const isEdit = isEditing && !!recordId;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    cantidad_acompanantes: 0,
    tipo_viaje: 'ida_vuelta',
    destino: '',
    fecha_turno: hoyLocal(),
    motivo_viaje: '',
    precio_unitario: 0,
  });
  const [acompanantes, setAcompanantes] = useState([]);
  const [nuevoAcompanante, setNuevoAcompanante] = useState({ nombre: '', dni: '' });

  useEffect(() => {
    if (initialData) {
      setFormData({
        cantidad_acompanantes: initialData.cantidad_acompanantes ?? 0,
        tipo_viaje: initialData.tipo_viaje || 'ida_vuelta',
        destino: initialData.destino || '',
        fecha_turno: initialData.fecha_turno || hoyLocal(),
        motivo_viaje: initialData.motivo_viaje || '',
        precio_unitario: initialData.precio_unitario ?? 0,
      });
      try {
        const acompData = initialData.acompanantes_detalle ? JSON.parse(initialData.acompanantes_detalle) : [];
        setAcompanantes(acompData);
      } catch (e) {
        setAcompanantes([]);
      }
    }
  }, [initialData]);

  const calcularPrecioTotal = () => {
    const unitario = parseFloat(formData.precio_unitario) || 0;
    const personas = 1 + acompanantes.length; // titular + acompañantes reales
    const multiplicador = formData.tipo_viaje === 'ida_vuelta' ? 2 : 1;
    return (personas * unitario * multiplicador).toFixed(2);
  };

  const agregarAcompanante = () => {
    if (!nuevoAcompanante.nombre.trim()) {
      alert('Ingresá el nombre del acompañante');
      return;
    }
    const newAcomp = { ...nuevoAcompanante, id: Date.now() };
    setAcompanantes([...acompanantes, newAcomp]);
    setNuevoAcompanante({ nombre: '', dni: '' });
  };

  const eliminarAcompanante = (id) => {
    setAcompanantes(acompanantes.filter(a => a.id !== id));
    setFormData({ ...formData, cantidad_acompanantes: Math.max(0, parseInt(formData.cantidad_acompanantes) - 1) });
  };

  const handleAgregarPorDatos = () => {
    setFormData({ ...formData, cantidad_acompanantes: acompanantes.length });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataToInsert = {
        ...formData,
        cantidad_acompanantes: acompanantes.length,
        acompanantes_detalle: JSON.stringify(acompanantes),
        precio_total: parseFloat(calcularPrecioTotal()),
      };

      if (isEdit) {
        const { error } = await supabase.from('cic_pasajes').update(dataToInsert).eq('id', recordId);
        if (error) throw error;
        alert('Pasajes actualizados correctamente');
      } else {
        const fichaId = caseId || null;
        if (!fichaId) throw new Error('No se encontró el ID del caso.');

        const { data: caso, error: caseError } = await supabase.from('cases').select('person_id').eq('id', fichaId).maybeSingle();
        if (caseError) throw caseError;
        if (!caso) throw new Error('No se encontró el caso.');

        const personId = caso.person_id || null;

        const { error } = await supabase.from('cic_pasajes').insert({ 
          ficha_id: fichaId, 
          person_id: personId, 
          ...dataToInsert 
        });
        if (error) throw error;
        alert('Pasajes registrados correctamente');
      }
      onClose();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const f = formData;
  const s = (k, v) => setFormData({ ...f, [k]: v });
  const precioTotal = calcularPrecioTotal();

  return (
    <div className="flex flex-col h-full min-h-0 animate-in slide-in-from-right-8 duration-300" style={{ minHeight: 0 }}>
      <div className="p-8 border-b border-white/5 flex items-center gap-6">
        <button onClick={onBack} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-pink-500/10 rounded-xl text-pink-400">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Pasajes de Ómnibus</h2>
            <p className="text-[10px] uppercase font-black text-pink-400 tracking-widest mt-1">
              {isEdit ? '✏️ Editando registro' : 'CIC'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">

          {/* Datos del viaje */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">Datos del Viaje</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label>Destino</label>
                <input placeholder="Ej: Eldorado - Hospital Samic" value={f.destino} onChange={e => s('destino', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label>Fecha de Turno</label>
                <input type="date" value={f.fecha_turno} onChange={e => s('fecha_turno', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label>Tipo de Viaje</label>
                <select value={f.tipo_viaje} onChange={e => s('tipo_viaje', e.target.value)} className="min-h-11">
                  <option value="ida_vuelta">Ida y Vuelta</option>
                  <option value="solo_ida">Solo Ida</option>
                  <option value="solo_vuelta">Solo Vuelta</option>
                </select>
              </div>
              <div className="space-y-2">
                <label>Precio Unitario ($)</label>
                <input type="number" step="0.01" placeholder="0.00" value={f.precio_unitario} onChange={e => s('precio_unitario', e.target.value)} required className="font-bold text-pink-400" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label>Motivo del Viaje</label>
                <textarea rows="2" placeholder="Describa el motivo médico o social..." value={f.motivo_viaje} onChange={e => s('motivo_viaje', e.target.value)} required />
              </div>
            </div>
          </div>

          {/* Acompañantes */}
          <div className="space-y-4 border-t border-white/10 pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Acompañantes</h3>
              <span className="text-xs bg-pink-500/10 border border-pink-500/20 text-pink-400 px-3 py-1 rounded-lg font-bold">
                {acompanantes.length} {acompanantes.length === 1 ? 'acompañante' : 'acompañantes'}
              </span>
            </div>

            {/* Agregar acompañante */}
            <div className="space-y-3 p-4 rounded-xl bg-white/2 border border-white/5">
              <p className="text-xs text-muted font-bold uppercase tracking-widest">Agregar acompañante</p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Nombre completo"
                  value={nuevoAcompanante.nombre}
                  onChange={e => setNuevoAcompanante({ ...nuevoAcompanante, nombre: e.target.value })}
                  className="py-2! text-xs"
                />
                <input
                  placeholder="DNI (opcional)"
                  value={nuevoAcompanante.dni}
                  onChange={e => setNuevoAcompanante({ ...nuevoAcompanante, dni: e.target.value })}
                  className="py-2! text-xs"
                />
              </div>
              <button
                type="button"
                onClick={agregarAcompanante}
                className="secondary w-full py-2! text-xs flex items-center justify-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar
              </button>
            </div>

            {/* Lista de acompañantes */}
            {acompanantes.length > 0 && (
              <div className="space-y-2">
                {acompanantes.map(a => (
                  <div key={a.id} className="p-3 rounded-lg bg-white/3 border border-white/8 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{a.nombre}</p>
                      {a.dni && <p className="text-[10px] text-muted font-mono">{a.dni}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => eliminarAcompanante(a.id)}
                      className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumen de precio */}
          <div className="border-t border-white/10 pt-6 p-4 rounded-xl bg-pink-500/5 border space-y-2">
            <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest">Cálculo de costo</p>
            <div className="space-y-1 text-xs text-white/70">
              <div className="flex justify-between">
                <span>Precio unitario:</span>
                <span className="font-mono">${f.precio_unitario || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Cantidad de personas:</span>
                <span className="font-bold">{1 + acompanantes.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Tipo de viaje:</span>
                <span className="font-bold">{f.tipo_viaje === 'ida_vuelta' ? 'Ida y vuelta (x2)' : 'Un solo tramo'}</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between text-white font-bold text-sm">
                <span>Precio total:</span>
                <span className="text-pink-400">${precioTotal}</span>
              </div>
            </div>
          </div>

        </div>

        <div className="p-8 border-t border-white/5 flex gap-4 bg-white/2">
          <button
            type="submit"
            disabled={loading}
            className="primary flex-1 py-4! text-lg! flex items-center justify-center gap-3"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Registrar Pasajes'}
          </button>
          <button type="button" onClick={onBack} className="secondary px-10! py-4!">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default PasajesForm;