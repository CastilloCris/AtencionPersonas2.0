import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

const PeopleModal = ({ isOpen, onClose, onViewPerson, profile }) => {
  const [search, setSearch] = useState('');
  const [people, setPeople] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const isOperator = profile?.role === 'operator';

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search || search.length < 2) {
      setStatus('Escriba un DNI o nombre para buscar.');
      return;
    }

    setLoading(true);
    setStatus('Buscando...');

    const sDni = search.replace(/\D/g, "");
    const hasLetters = /[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(search);

    let q = supabase
      .from('persons')
      .select('id, dni, apellido_nombre,telefono,domicilio,fecha_nacimiento,updated_at')
      .order('updated_at', { ascending: false })
      .limit(50);

    if (sDni.length >= 7 && !hasLetters) {
      q = q.eq('dni', sDni);
    } else {
      q = q.ilike('apellido_nombre', `%${search}%`);
    }

    const { data, error } = await q;

    if (error) {
      setStatus(`Error: ${error.message}`);
    } else {
      setPeople(data || []);
      setStatus(data.length === 0 ? 'No se encontraron resultados.' : `Se encontraron ${data.length} personas.`);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-2000 flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
      <div className="bg-card w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-[32px] border border-white/10 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between bg-white/2">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black tracking-tight">Gestión de Personas</h2>
            <p className="text-[10px] uppercase font-bold text-accent tracking-widest">Base de datos de ciudadanos</p>
          </div>
          <button className="danger p-3! rounded-2xl" onClick={onClose}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <form onSubmit={handleSearch} className="flex gap-4 items-end mb-8">
            <div className="flex-1">
              <label>Buscar Ciudadano</label>
              <input 
                placeholder="Nombre, Apellido o DNI..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white/5"
              />
            </div>
            <button className="primary px-8! h-[46px]" type="submit" disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </form>

          <div className="tableWrap bg-black/20">
            <table>
              <thead>
                <tr>
                  <th>DNI</th>
                  <th>Apellido y Nombre</th>
                  <th>Teléfono</th>
                  <th>Domicilio</th>
                  <th>Última Act.</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {people.length > 0 ? people.map(p => (
                  <tr key={p.id}>
                    <td className="font-mono text-xs font-bold text-white/70">{p.dni}</td>
                    <td className="font-bold text-white">{p.apellido_nombre}</td>
                    <td className="text-xs">{p.telefono || '-'}</td>
                    <td className="text-xs opacity-60 truncate max-w-[200px]">{p.domicilio || '-'}</td>
                    <td className="text-[10px] font-bold opacity-40 uppercase">
                      {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="text-right">
                      <button 
                        className="secondary text-[10px] uppercase font-black px-3! py-1!"
                        onClick={() => { onViewPerson(p.id); onClose(); }}
                      >
                        Ver Ficha
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="py-20 text-center">
                      <div className="flex flex-col items-center gap-2 opacity-30">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <p className="text-sm font-bold uppercase tracking-widest">{status || 'Inicie una búsqueda'}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/20 text-center border-t border-white/5">
          <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Total de resultados: {people.length}</p>
        </div>
      </div>
    </div>
  );
};

export default PeopleModal;
