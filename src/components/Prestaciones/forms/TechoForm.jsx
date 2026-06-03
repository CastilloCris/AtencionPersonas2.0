import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { ArrowLeft, Save, Home } from 'lucide-react';

const TechoForm = ({ caseId, onBack, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    chapa_zinc: 0,
    tirantes: 0,
    clavadores: 0,
    clavos_kg: 0,
    cumbreras: 0,
    fecha_entrega: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('as_construyendo_techo').insert({
        case_id: caseId,
        ...formData
      });
      if (error) throw error;
      alert('Datos de Techo guardados correctamente');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al guardar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-8 duration-300">
      <div className="p-8 border-b border-white/5 flex items-center gap-6">
        <button onClick={onBack} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Construyendo Techo</h2>
            <p className="text-[10px] uppercase font-black text-emerald-400 tracking-widest mt-1">Acción Social</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label>Chapas de Zinc</label>
            <input type="number" value={formData.chapa_zinc} onChange={(e) => setFormData({...formData, chapa_zinc: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label>Tirantes</label>
            <input type="number" value={formData.tirantes} onChange={(e) => setFormData({...formData, tirantes: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label>Clavadores</label>
            <input type="number" value={formData.clavadores} onChange={(e) => setFormData({...formData, clavadores: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label>Clavos (kg)</label>
            <input type="number" step="0.01" value={formData.clavos_kg} onChange={(e) => setFormData({...formData, clavos_kg: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label>Cumbreras</label>
            <input type="number" value={formData.cumbreras} onChange={(e) => setFormData({...formData, cumbreras: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label>Fecha de Entrega</label>
            <input type="date" value={formData.fecha_entrega} onChange={(e) => setFormData({...formData, fecha_entrega: e.target.value})} required />
          </div>
        </div>

        <div className="pt-8 flex gap-4">
          <button type="submit" disabled={loading} className="primary flex-1 py-4! text-lg! flex items-center justify-center gap-3">
            <Save className="w-5 h-5" />
            {loading ? 'Guardando...' : 'Registrar Entrega'}
          </button>
          <button type="button" onClick={onBack} className="secondary px-10! py-4!">Volver</button>
        </div>
      </form>
    </div>
  );
};

export default TechoForm;
