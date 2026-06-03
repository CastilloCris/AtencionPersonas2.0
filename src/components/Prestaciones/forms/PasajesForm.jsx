import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { ArrowLeft, Save, Ticket } from 'lucide-react';

const PasajesForm = ({ caseId, onBack, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    cantidad_acompanantes: 0,
    tipo_viaje: 'ida_vuelta',
    destino: '',
    fecha_turno: new Date().toISOString().split('T')[0],
    motivo_viaje: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // La tabla cic_pasajes usa ficha_id (FK a cases) y person_id.
      // Obtenemos el person_id desde el caso antes de insertar.
      const { data: caso, error: caseError } = await supabase
        .from('cases')
        .select('person_id')
        .eq('id', caseId)
        .maybeSingle();

      if (caseError) throw caseError;
      if (!caso) throw new Error('No se encontró el caso asociado.');

      const { error } = await supabase.from('cic_pasajes').insert({
        ficha_id: caseId,          // FK real en la tabla
        person_id: caso.person_id, // FK real en la tabla
        ...formData
      });

      if (error) throw error;
      alert('Pasajes registrados correctamente');
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
          <div className="p-3 bg-pink-500/10 rounded-xl text-pink-400">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Pasajes de Ómnibus</h2>
            <p className="text-[10px] uppercase font-black text-pink-400 tracking-widest mt-1">CIC</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-muted tracking-widest ml-1">Destino</label>
              <input
                placeholder="Ej: Eldorado - Hospital Samic"
                value={formData.destino}
                onChange={(e) => setFormData({...formData, destino: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-muted tracking-widest ml-1">Fecha de Turno</label>
              <input
                type="date"
                value={formData.fecha_turno}
                onChange={(e) => setFormData({...formData, fecha_turno: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-muted tracking-widest ml-1">Tipo de Viaje</label>
              <select
                value={formData.tipo_viaje}
                onChange={(e) => setFormData({...formData, tipo_viaje: e.target.value})}
                className="min-h-[44px]"
              >
                <option value="ida_vuelta">Ida y Vuelta</option>
                <option value="solo_ida">Solo Ida</option>
                <option value="solo_vuelta">Solo Vuelta</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-muted tracking-widest ml-1">Acompañantes</label>
              <input
                type="number"
                value={formData.cantidad_acompanantes}
                onChange={(e) => setFormData({...formData, cantidad_acompanantes: e.target.value})}
                min="0"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] uppercase font-black text-muted tracking-widest ml-1">Motivo del Viaje</label>
              <textarea
                rows="3"
                placeholder="Describa el motivo médico o social..."
                value={formData.motivo_viaje}
                onChange={(e) => setFormData({...formData, motivo_viaje: e.target.value})}
                required
              />
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-white/5 flex gap-4 bg-white/2">
          <button
            type="submit"
            disabled={loading}
            className="primary flex-1 py-4! text-lg! flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-pink-500/10"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Guardando...' : 'Registrar Pasajes'}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="secondary px-10! py-4! active:scale-95 transition-all"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default PasajesForm;