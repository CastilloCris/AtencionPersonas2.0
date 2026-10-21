import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { ArrowLeft, Save, DollarSign } from 'lucide-react';
import { hoyLocal } from '../../../lib/fechas';

const EconomicoForm = ({ caseId, onBack, onClose, initialData, recordId, isEditing }) => {
  const isEdit = isEditing && !!recordId;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    monto: 0,
    concepto: '',
    fecha_entrega: hoyLocal(),
    observaciones: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        monto: initialData.monto ?? 0,
        concepto: initialData.concepto || '',
        fecha_entrega: initialData.fecha_entrega || hoyLocal(),
        observaciones: initialData.observaciones || ''
      });
    }
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        const { error } = await supabase.from('cic_economico').update(formData).eq('id', recordId);
        if (error) throw error;
        alert('Ayuda económica actualizada correctamente');
      } else {
        const { data: caso, error: caseError } = await supabase.from('cases').select('person_id').eq('id', caseId).maybeSingle();
        if (caseError) throw caseError;
        if (!caso) throw new Error('No se encontró el caso.');
        const { error } = await supabase.from('cic_economico').insert({
          case_id: caseId,
          ficha_id: caseId,
          ...formData
        });
        if (error) throw error;
        alert('Ayuda económica registrada correctamente');
      }
      onClose();
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const f = formData;
  const s = (k, v) => setFormData({ ...f, [k]: v });

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-8 duration-300">
      <div className="p-8 border-b border-white/5 flex items-center gap-6">
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
              {isEdit ? '✏️ Editando registro' : 'CIC'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-6">

          <div className="space-y-2">
            <label>Monto ($)</label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={f.monto}
              onChange={e => s('monto', e.target.value)}
              required
              className="text-xl! font-bold text-green-400"
            />
          </div>

          <div className="space-y-2">
            <label>Concepto / Descripción</label>
            <input
              placeholder="Ej: Ayuda para alquiler, servicios, alimentos, etc."
              value={f.concepto}
              onChange={e => s('concepto', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label>Fecha de Entrega</label>
            <input
              type="date"
              value={f.fecha_entrega}
              onChange={e => s('fecha_entrega', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label>Observaciones</label>
            <textarea
              rows="3"
              placeholder="Notas adicionales sobre la ayuda otorgada..."
              value={f.observaciones}
              onChange={e => s('observaciones', e.target.value)}
            />
          </div>

          {/* Resumen */}
          <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/15 space-y-2">
            <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">Resumen</p>
            <div className="space-y-1 text-xs text-white/70">
              <div className="flex justify-between">
                <span>Monto:</span>
                <span className="font-bold text-green-400">${parseFloat(f.monto || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Concepto:</span>
                <span className="font-mono">{f.concepto || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>Fecha:</span>
                <span className="font-mono">{f.fecha_entrega}</span>
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
            {loading ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Registrar Ayuda'}
          </button>
          <button type="button" onClick={onBack} className="secondary px-10! py-4!">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default EconomicoForm;