import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { ArrowLeft, Save, Fuel } from 'lucide-react';

const CombustibleForm = ({ caseId, onBack, onClose, initialData, recordId, isEditing }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    cantidad_litros: initialData?.cantidad_litros ?? 0,
    tipo_combustible: initialData?.tipo_combustible ?? 'nafta',
    patente_movil: initialData?.patente_movil ?? '',
    marca_movil: initialData?.marca_movil ?? '',
    motivo_viaje: initialData?.motivo_viaje ?? '',
    destino: initialData?.destino ?? '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let error;
      if (isEditing && recordId) {
        ({ error } = await supabase.from('cic_combustible').update(formData).eq('id', recordId));
      } else {
        ({ error } = await supabase.from('cic_combustible').insert({ case_id: caseId, ...formData }));
      }
      if (error) throw error;
      alert(isEditing ? 'Carga de combustible actualizada' : 'Carga de combustible registrada');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al guardar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

      {/* Header */}
      <div className="p-8 border-b border-white/5 flex items-center gap-6" style={{ flexShrink: 0 }}>
        <button onClick={onBack} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-400">
            <Fuel className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Carga de Combustible</h2>
            <p className="text-[10px] uppercase font-black text-yellow-400 tracking-widest mt-1">
              {isEditing ? '✏ Editando registro' : 'CIC'}
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 2.5rem' }}>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-muted tracking-widest ml-1">Cantidad de Litros</label>
            <input
              type="number"
              step="0.01"
              value={formData.cantidad_litros}
              onChange={(e) => setFormData({...formData, cantidad_litros: e.target.value})}
              required
              className="text-xl! font-bold"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-muted tracking-widest ml-1">Tipo de Combustible</label>
            <select
              value={formData.tipo_combustible}
              onChange={(e) => setFormData({...formData, tipo_combustible: e.target.value})}
              className="min-h-[44px]"
            >
              <option value="nafta">Nafta</option>
              <option value="gasoil">Gasoil</option>
              <option value="gnc">GNC</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-muted tracking-widest ml-1">Patente del Móvil</label>
            <input
              placeholder="Ej: ABC-123"
              value={formData.patente_movil}
              onChange={(e) => setFormData({...formData, patente_movil: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-muted tracking-widest ml-1">Marca del Móvil</label>
            <input
              placeholder="Ej: Toyota Hilux"
              value={formData.marca_movil}
              onChange={(e) => setFormData({...formData, marca_movil: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] uppercase font-black text-muted tracking-widest ml-1">Destino</label>
            <input
              placeholder="Destino del viaje"
              value={formData.destino}
              onChange={(e) => setFormData({...formData, destino: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] uppercase font-black text-muted tracking-widest ml-1">Motivo del Viaje</label>
            <textarea
              rows="3"
              placeholder="Describa la necesidad del combustible..."
              value={formData.motivo_viaje}
              onChange={(e) => setFormData({...formData, motivo_viaje: e.target.value})}
              required
            />
          </div>
        </div>
      </div>

      {/* Footer — siempre visible */}
      <form
        onSubmit={handleSubmit}
        style={{
          flexShrink: 0,
          display: 'flex',
          gap: '1rem',
          padding: '1.5rem 2rem',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          backgroundColor: 'rgba(255,255,255,0.02)',
          minHeight: '88px',
          alignItems: 'center'
        }}
      >
        <button
          type="submit"
          disabled={loading}
          className="primary flex-1 flex items-center justify-center gap-3"
          style={{ minHeight: '52px', fontSize: '1rem', fontWeight: 700 }}
        >
          <Save className="w-5 h-5" />
          {loading ? 'Guardando...' : isEditing ? '✓ Guardar Cambios' : 'Registrar Carga'}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="secondary"
          style={{ minHeight: '52px', padding: '0 2rem' }}
        >
          Cancelar
        </button>
      </form>

    </div>
  );
};

export default CombustibleForm;