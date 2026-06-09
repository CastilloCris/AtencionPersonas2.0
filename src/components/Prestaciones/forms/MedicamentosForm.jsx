import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { ArrowLeft, Save, Pill } from 'lucide-react';

const MedicamentosForm = ({ caseId, onBack, onClose, initialData, recordId, isEditing }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre_medicamento: initialData?.nombre_medicamento ?? '',
    monto_medicamento: initialData?.monto_medicamento ?? 0,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let error;
      if (isEditing && recordId) {
        ({ error } = await supabase.from('cic_medicamentos').update(formData).eq('id', recordId));
      } else {
        ({ error } = await supabase.from('cic_medicamentos').insert({ case_id: caseId, ...formData }));
      }
      if (error) throw error;
      alert(isEditing ? 'Medicamento actualizado correctamente' : 'Ayuda para medicamentos registrada');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al guardar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-8 duration-300" style={{ minHeight: 0 }}>
      <div className="p-8 border-b border-white/5 flex items-center gap-6 shrink-0">
        <button onClick={onBack} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500/10 rounded-xl text-red-400">
            <Pill className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Ayuda Medicamentos</h2>
            <p className="text-[10px] uppercase font-black text-red-400 tracking-widest mt-1">
              {isEditing ? '✏ Editando registro' : 'CIC'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="grid gap-8">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-muted tracking-widest ml-1">Nombre del Medicamento / Tratamiento</label>
              <input
                placeholder="Ej: Amoxicilina 500mg x 16 comp."
                value={formData.nombre_medicamento}
                onChange={(e) => setFormData({ ...formData, nombre_medicamento: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-muted tracking-widest ml-1">Costo del Medicamento ($)</label>
              <input
                type="number" step="0.01" placeholder="0.00"
                value={formData.monto_medicamento}
                onChange={(e) => setFormData({ ...formData, monto_medicamento: e.target.value })}
                required
                className="text-xl! font-bold text-red-400"
              />
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-white/5 flex gap-4 bg-white/2 shrink-0">
          <button type="submit" disabled={loading} className="primary flex-1 py-4! text-lg! flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-red-500/10">
            <Save className="w-5 h-5" />
            {loading ? 'Guardando...' : isEditing ? '✓ Guardar Cambios' : 'Registrar Ayuda'}
          </button>
          <button type="button" onClick={onBack} className="secondary px-10! py-4! active:scale-95 transition-all">Cancelar</button>
        </div>
      </form>
    </div>
  );
};

export default MedicamentosForm;
