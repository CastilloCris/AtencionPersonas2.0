import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const FamilyGroupSection = ({ currentPerson }) => {
  const [members, setMembers] = useState([]);
  const [formData, setFormData] = useState({ nombre: '', dni: '', vinculo: '', observaciones: '', fecha_nacimiento: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentPerson) loadMembers();
    else setMembers([]);
  }, [currentPerson]);

  const loadMembers = async () => {
    const { data } = await supabase.from('family_members').select('*').eq('person_id', currentPerson.id).order('created_at');
    setMembers(data || []);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!currentPerson) return;
    setLoading(true);
    await supabase.from('family_members').insert({
      person_id: currentPerson.id,
      apellido_nombres: formData.nombre,
      dni: formData.dni,
      fecha_nacimiento: formData.fecha_nacimiento || null,
      vinculo: formData.vinculo,
      observaciones: formData.observaciones
    });
    setFormData({ nombre: '', dni: '', vinculo: '', observaciones: '', fecha_nacimiento: '' });
    loadMembers();
    setLoading(false);
  };

  const calcularEdad = (fechaNac) => {
    if (!fechaNac) return null;
    const hoy = new Date();
    const nac = new Date(fechaNac);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad >= 0 ? edad : null;
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
            <input 
              placeholder="Nombre completo" 
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              required
              disabled={!currentPerson}
              className="py-2! text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label>DNI</label>
            <input 
              placeholder="DNI" 
              value={formData.dni}
              onChange={(e) => setFormData({...formData, dni: e.target.value})}
              disabled={!currentPerson}
              className="py-2! text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label>Fecha de Nacimiento</label>
            <div className="flex gap-3 items-center">
              <input
                type="date"
                value={formData.fecha_nacimiento}
                onChange={(e) => setFormData({...formData, fecha_nacimiento: e.target.value})}
                disabled={!currentPerson}
                className="flex-1 py-2! text-xs"
              />
              {calcularEdad(formData.fecha_nacimiento) !== null && (
                <div className="flex items-center gap-1.5 bg-accent/10 border border-accent/20 
                                rounded-xl px-3 py-2 shrink-0">
                  <span className="text-base font-black text-accent leading-none">
                    {calcularEdad(formData.fecha_nacimiento)}
                  </span>
                  <span className="text-[9px] text-muted uppercase tracking-widest">
                    años
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label>Vínculo</label>
            <input 
              placeholder="Ej: Hijo, Cónyuge, Madre..." 
              value={formData.vinculo}
              onChange={(e) => setFormData({...formData, vinculo: e.target.value})}
              disabled={!currentPerson}
              className="py-2! text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label>Observaciones</label>
            <input 
              placeholder="Ej: Discapacidad, medicación..." 
              value={formData.observaciones}
              onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
              disabled={!currentPerson}
              className="py-2! text-xs"
            />
          </div>
        </div>
        <button className="primary w-full py-2! text-xs" type="submit" disabled={loading || !currentPerson}>
          {loading ? 'Agregando...' : 'Agregar Integrante'}
        </button>
      </form>

      <div className="tableWrap bg-black/40! mt-4 overflow-x-auto">
        <table className="w-full min-w-[300px]">
          <thead>
            <tr><th>Nombre</th><th>DNI</th><th>Fecha Nac.</th><th>Edad</th><th>Vínculo</th><th>Observaciones</th></tr>
          </thead>
          <tbody>
            {members.length > 0 ? members.map(m => (
              <tr key={m.id}>
                <td className="font-bold text-white text-xs">{m.apellido_nombres}</td>
                <td className="text-[10px]">{m.dni || '-'}</td>
                <td className="text-[10px]">
                  {m.fecha_nacimiento 
                    ? new Date(m.fecha_nacimiento).toLocaleDateString('es-AR') 
                    : '-'}
                </td>
                <td className="text-[10px] text-center">
                  {calcularEdad(m.fecha_nacimiento) !== null 
                    ? <span className="font-bold text-accent">
                        {calcularEdad(m.fecha_nacimiento)}
                      </span>
                    : '-'}
                </td>
                <td className="text-[10px] opacity-60">{m.vinculo || '-'}</td>
                <td className="text-[10px] opacity-60">{m.observaciones || '-'}</td>
              </tr>
            )) : (
              <tr><td colSpan="6" className="text-center py-8 text-muted/40 text-xs italic">No hay integrantes.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default FamilyGroupSection;
