import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { ArrowLeft, Save, Heart } from 'lucide-react';

const FunebreForm = ({ caseId, onBack, onClose, initialData, recordId, isEditing }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fecha_fallecimiento: initialData?.fecha_fallecimiento ?? new Date().toISOString().split('T')[0],
    nombre_fallecido: initialData?.nombre_fallecido ?? '',
    apellido_fallecido: initialData?.apellido_fallecido ?? '',
    recibio_modulo: initialData?.recibio_modulo ?? false,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let error;
      if (isEditing && recordId) {
        ({ error } = await supabase.from('as_funebre').update(formData).eq('id', recordId));
      } else {
        ({ error } = await supabase.from('as_funebre').insert({ case_id: caseId, ...formData }));
      }
      if (error) throw error;
      alert(isEditing ? 'Servicio Fúnebre actualizado correctamente' : 'Servicio Fúnebre registrado correctamente');
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
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Servicio Fúnebre</h2>
            <p className="text-[10px] uppercase font-black text-purple-400 tracking-widest mt-1">
              {isEditing ? '✏ Editando registro' : 'Acción Social'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar" style={{ minHeight: 0 }}>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label>Nombre del Fallecido</label>
            <input value={formData.nombre_fallecido} onChange={(e) => setFormData({ ...formData, nombre_fallecido: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <label>Apellido del Fallecido</label>
            <input value={formData.apellido_fallecido} onChange={(e) => setFormData({ ...formData, apellido_fallecido: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <label>Fecha de Fallecimiento</label>
            <input type="date" value={formData.fecha_fallecimiento} onChange={(e) => setFormData({ ...formData, fecha_fallecimiento: e.target.value })} required />
          </div>
          <div className="space-y-4">
            <label className="block">¿Recibió Módulo Alimentario?</label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="recibio_modulo" checked={formData.recibio_modulo === true} onChange={() => setFormData({ ...formData, recibio_modulo: true })} />
                <span>Sí</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="recibio_modulo" checked={formData.recibio_modulo === false} onChange={() => setFormData({ ...formData, recibio_modulo: false })} />
                <span>No</span>
              </label>
            </div>
          </div>
        </div>

        <div className="pt-8 flex gap-4">
          <button type="submit" disabled={loading} className="primary flex-1 py-4! text-lg! flex items-center justify-center gap-3">
            <Save className="w-5 h-5" />
            {loading ? 'Guardando...' : isEditing ? '✓ Guardar Cambios' : 'Registrar Servicio'}
          </button>
          <button type="button" onClick={onBack} className="secondary px-10! py-4!">Cancelar</button>
        </div>
      </form>
    </div>
  );
};

export default FunebreForm;
