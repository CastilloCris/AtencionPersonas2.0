import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { ArrowLeft, Save, Truck } from 'lucide-react';

const ViajesForm = ({ caseId, onBack, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    destino: '',
    fecha: new Date().toISOString().split('T')[0],
    hora_salida_wanda: '',
    hora_llegada_destino: '',
    hora_salida_destino: '',
    hora_llegada_wanda: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('as_viajes_movil').insert({
        case_id: caseId,
        ...formData
      });
      if (error) throw error;
      alert('Viaje registrado correctamente');
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
          <div className="p-3 bg-orange-500/10 rounded-xl text-orange-400">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Viajes Acción Social</h2>
            <p className="text-[10px] uppercase font-black text-orange-400 tracking-widest mt-1">Acción Social</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <label>Destino</label>
            <input 
              placeholder="Ej: Posadas - Hospital Madariaga"
              value={formData.destino}
              onChange={(e) => setFormData({...formData, destino: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <label>Fecha del Viaje</label>
            <input 
              type="date"
              value={formData.fecha}
              onChange={(e) => setFormData({...formData, fecha: e.target.value})}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label>Salida Wanda</label>
              <input type="time" value={formData.hora_salida_wanda} onChange={(e) => setFormData({...formData, hora_salida_wanda: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label>Llegada Dest.</label>
              <input type="time" value={formData.hora_llegada_destino} onChange={(e) => setFormData({...formData, hora_llegada_destino: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label>Salida Dest.</label>
              <input type="time" value={formData.hora_salida_destino} onChange={(e) => setFormData({...formData, hora_salida_destino: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label>Llegada Wanda</label>
              <input type="time" value={formData.hora_llegada_wanda} onChange={(e) => setFormData({...formData, hora_llegada_wanda: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="pt-8 flex gap-4">
          <button type="submit" disabled={loading} className="primary flex-1 py-4! text-lg! flex items-center justify-center gap-3">
            <Save className="w-5 h-5" />
            {loading ? 'Guardando...' : 'Registrar Viaje'}
          </button>
          <button type="button" onClick={onBack} className="secondary px-10! py-4!">Cancelar</button>
        </div>
      </form>
    </div>
  );
};

export default ViajesForm;
