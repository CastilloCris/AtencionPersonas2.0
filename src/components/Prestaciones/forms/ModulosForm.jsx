import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { ArrowLeft, Save } from 'lucide-react';

const ModulosForm = ({ caseId, onBack, onClose, initialData, recordId, isEditing }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    cantidad: initialData?.cantidad ?? 1,
    fecha_entrega: initialData?.fecha_entrega ?? new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let error;
      if (isEditing && recordId) {
        ({ error } = await supabase.from('as_modulos_alimenticios').update(formData).eq('id', recordId));
      } else {
        ({ error } = await supabase.from('as_modulos_alimenticios').insert({ ficha_id: caseId, ...formData }));
      }
      if (error) throw error;
      alert(isEditing ? 'Módulo actualizado correctamente' : 'Módulo guardado correctamente');
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
        <div>
          <h2 className="text-2xl font-black text-white">Módulos Alimenticios</h2>
          <p className="text-[10px] uppercase font-black text-blue-400 tracking-widest mt-1">
            {isEditing ? '✏ Editando registro' : 'Acción Social'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar" style={{ minHeight: 0 }}>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label>Cantidad de Módulos</label>
            <input
              type="number"
              value={formData.cantidad}
              onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
              min="1"
              required
            />
          </div>
          <div className="space-y-2">
            <label>Fecha de Entrega</label>
            <input
              type="date"
              value={formData.fecha_entrega}
              onChange={(e) => setFormData({ ...formData, fecha_entrega: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="pt-8 flex gap-4">
          <button type="submit" disabled={loading} className="primary flex-1 py-4! text-lg! flex items-center justify-center gap-3">
            <Save className="w-5 h-5" />
            {loading ? 'Guardando...' : isEditing ? '✓ Guardar Cambios' : 'Confirmar Entrega'}
          </button>
          <button type="button" onClick={onBack} className="secondary px-10! py-4!">Cancelar</button>
        </div>
      </form>
    </div>
  );
};

export default ModulosForm;