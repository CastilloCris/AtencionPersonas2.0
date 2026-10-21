import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { calcularEdad } from '../../lib/fechas';

const FamilyGroupSection = ({ currentPerson }) => {
  const [members, setMembers] = useState([]);
  const [formData, setFormData] = useState({ nombre: '', dni: '', vinculo: '', observaciones: '', fecha_nacimiento: '', edad_manual: '' });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    if (currentPerson) loadMembers();
    else setMembers([]);
  }, [currentPerson]);

  const loadMembers = async () => {
    const { data } = await supabase.from('family_members').select('*').eq('person_id', currentPerson.id).order('created_at');
    setMembers(data || []);
  };

  const getEdadDisplay = (m) => {
    const porFecha = calcularEdad(m.fecha_nacimiento);
    if (porFecha !== null) return `${porFecha} años`;
    if (m.edad_manual) return `${m.edad_manual} años`;
    return '-';
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!currentPerson) return;
    setLoading(true);
    await supabase.from('family_members').insert({
      person_id: currentPerson.id,
      apellido_nombres: formData.nombre,
      dni: formData.dni,
      vinculo: formData.vinculo,
      observaciones: formData.observaciones,
      fecha_nacimiento: formData.fecha_nacimiento || null,
      edad_manual: formData.fecha_nacimiento ? null : (formData.edad_manual || null),
    });
    setFormData({ nombre: '', dni: '', vinculo: '', observaciones: '', fecha_nacimiento: '', edad_manual: '' });
    loadMembers();
    setLoading(false);
  };

  const handleEditStart = (m) => {
    setEditingId(m.id);
    setEditData({
      apellido_nombres: m.apellido_nombres || '',
      dni: m.dni || '',
      vinculo: m.vinculo || '',
      observaciones: m.observaciones || '',
      fecha_nacimiento: m.fecha_nacimiento || '',
      edad_manual: m.edad_manual || '',
    });
  };

  const handleEditSave = async (id) => {
    await supabase.from('family_members').update({
      apellido_nombres: editData.apellido_nombres,
      dni: editData.dni,
      vinculo: editData.vinculo,
      observaciones: editData.observaciones,
      fecha_nacimiento: editData.fecha_nacimiento || null,
      edad_manual: editData.fecha_nacimiento ? null : (editData.edad_manual || null),
    }).eq('id', id);
    setEditingId(null);
    setEditData({});
    loadMembers();
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este integrante?')) return;
    await supabase.from('family_members').delete().eq('id', id);
    loadMembers();
  };

  return (
    <section className="card space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <h2 className="text-lg font-bold text-white">Grupo Familiar</h2>
        <span className="text-[10px] font-bold text-muted uppercase tracking-widest">{members.length} integrantes</span>
      </div>

      <form onSubmit={handleAdd} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label>Nombre y Apellido</label>
            <input placeholder="Nombre completo" value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              required disabled={!currentPerson} className="py-2! text-xs" />
          </div>
          <div className="space-y-1.5">
            <label>DNI</label>
            <input placeholder="DNI" value={formData.dni}
              onChange={(e) => setFormData({...formData, dni: e.target.value})}
              disabled={!currentPerson} className="py-2! text-xs" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label>Vínculo</label>
            <input placeholder="Ej: Hijo, Cónyuge, Madre..." value={formData.vinculo}
              onChange={(e) => setFormData({...formData, vinculo: e.target.value})}
              disabled={!currentPerson} className="py-2! text-xs" />
          </div>
          <div className="space-y-1.5">
            <label>Observaciones</label>
            <input placeholder="Ej: Discapacidad, medicación..." value={formData.observaciones}
              onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
              disabled={!currentPerson} className="py-2! text-xs" />
          </div>
        </div>

        {/* Fecha de nacimiento + edad manual */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label>Fecha de Nacimiento</label>
            <div className="flex gap-2 items-center">
              <input type="date" value={formData.fecha_nacimiento}
                onChange={(e) => setFormData({...formData, fecha_nacimiento: e.target.value, edad_manual: ''})}
                disabled={!currentPerson} className="flex-1 py-2! text-xs" />
              {calcularEdad(formData.fecha_nacimiento) !== null && (
                <div className="flex items-center gap-1 bg-accent/10 border border-accent/20 rounded-xl px-2.5 py-1.5 shrink-0">
                  <span className="text-base font-black text-accent leading-none">{calcularEdad(formData.fecha_nacimiento)}</span>
                  <span className="text-[9px] text-muted uppercase tracking-widest">años</span>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <label>Edad (si no recuerda fecha)</label>
            <input type="number" placeholder="Ej: 34" min="0" max="120"
              value={formData.edad_manual}
              onChange={(e) => setFormData({...formData, edad_manual: e.target.value, fecha_nacimiento: ''})}
              disabled={!currentPerson || !!formData.fecha_nacimiento}
              className="py-2! text-xs" />
          </div>
        </div>

        <button className="primary w-full py-2! text-xs" type="submit" disabled={loading || !currentPerson}>
          {loading ? 'Agregando...' : 'Agregar Integrante'}
        </button>
      </form>

      <div className="tableWrap bg-black/40! mt-4 overflow-x-auto">
        <table className="w-full min-w-[400px]">
          <thead>
            <tr>
              <th>Nombre</th><th>DNI</th><th>Vínculo</th>
              <th>Edad</th><th>Observaciones</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {members.length > 0 ? members.map(m => (
              editingId === m.id ? (
                // Fila en modo edición
                <tr key={m.id} className="bg-accent/5">
                  <td>
                    <input value={editData.apellido_nombres}
                      onChange={e => setEditData({...editData, apellido_nombres: e.target.value})}
                      className="py-1! text-xs w-full" />
                  </td>
                  <td>
                    <input value={editData.dni}
                      onChange={e => setEditData({...editData, dni: e.target.value})}
                      className="py-1! text-xs w-full" />
                  </td>
                  <td>
                    <input value={editData.vinculo}
                      onChange={e => setEditData({...editData, vinculo: e.target.value})}
                      className="py-1! text-xs w-full" />
                  </td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <input type="date" value={editData.fecha_nacimiento}
                        onChange={e => setEditData({...editData, fecha_nacimiento: e.target.value, edad_manual: ''})}
                        className="py-1! text-[10px] w-full" />
                      <input type="number" placeholder="o edad manual" min="0" max="120"
                        value={editData.edad_manual}
                        disabled={!!editData.fecha_nacimiento}
                        onChange={e => setEditData({...editData, edad_manual: e.target.value, fecha_nacimiento: ''})}
                        className="py-1! text-[10px] w-full" />
                    </div>
                  </td>
                  <td>
                    <input value={editData.observaciones}
                      onChange={e => setEditData({...editData, observaciones: e.target.value})}
                      className="py-1! text-xs w-full" />
                  </td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => handleEditSave(m.id)}
                        className="primary py-1! px-2! text-[10px] w-full">
                        ✓ Guardar
                      </button>
                      <button onClick={handleEditCancel}
                        className="secondary py-1! px-2! text-[10px] w-full">
                        Cancelar
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                // Fila normal
                <tr key={m.id}>
                  <td className="font-bold text-white text-xs">{m.apellido_nombres}</td>
                  <td className="text-[10px]">{m.dni || '-'}</td>
                  <td className="text-[10px] opacity-60">{m.vinculo || '-'}</td>
                  <td className="text-[10px]">
                    {calcularEdad(m.fecha_nacimiento) !== null
                      ? <span className="font-bold text-accent">{calcularEdad(m.fecha_nacimiento)} años</span>
                      : m.edad_manual
                      ? <span className="text-white/50">{m.edad_manual} años</span>
                      : '-'}
                  </td>
                  <td className="text-[10px] opacity-60">{m.observaciones || '-'}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => handleEditStart(m)}
                        className="secondary py-1! px-2! text-[10px]">
                        ✏️
                      </button>
                      <button onClick={() => handleDelete(m.id)}
                        className="danger py-1! px-2! text-[10px]">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )) : (
              <tr>
                <td colSpan="6" className="text-center py-8 text-muted/40 text-xs italic">
                  No hay integrantes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default FamilyGroupSection;