import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { ArrowLeft, Save, DollarSign } from 'lucide-react';

const EconomicoForm = ({ caseId, onBack, onClose, initialData, recordId, isEditing }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    motivo: initialData?.motivo ?? '',
    monto: initialData?.monto ?? 0,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let error;
      if (isEditing && recordId) {
        ({ error } = await supabase.from('cic_economico').update(formData).eq('id', recordId));
      } else {
        ({ error } = await supabase.from('cic_economico').insert({ case_id: caseId, ...formData }));
      }
      if (error) throw error;
      alert(isEditing ? 'Ayuda económica actualizada' : 'Ayuda económica registrada');
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
          <div className="p-3 bg-green-500/10 rounded-xl text-green-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Ayuda Económica</h2>
            <p className="text-[10px] uppercase font-black text-green-400 tracking-widest mt-1">
              {isEditing ? '✏ Editando registro' : 'CIC'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="grid gap-8">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-muted tracking-widest ml-1">Monto Otorgado ($)</label>
              <input
                type="number" step="0.01" placeholder="0.00"
                value={formData.monto}
                onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                required
                className="text-2xl! py-6! font-black text-green-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-muted tracking-widest ml-1">Motivo de la Ayuda</label>
              <textarea
                rows="4" placeholder="Describa la necesidad y destino de los fondos..."
                value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                required
              />
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-white/5 flex gap-4 bg-white/2 shrink-0">
          <button type="submit" disabled={loading} className="primary flex-1 py-4! text-lg! flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-green-500/10">
            <Save className="w-5 h-5" />
            {loading ? 'Guardando...' : isEditing ? '✓ Guardar Cambios' : 'Confirmar Ayuda'}
          </button>
          <button type="button" onClick={onBack} className="secondary px-10! py-4! active:scale-95 transition-all">Cancelar</button>
        </div>
      </form>
    </div>
  );
};

export default EconomicoForm;
