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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-2000 flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-300">
      {/* En celular ocupa toda la pantalla (antes quedaba corrida y cortada) */}
      <div className="bg-card w-full min-w-0 max-w-full md:max-w-6xl h-full md:h-auto md:max-h-[90vh] overflow-hidden md:rounded-[32px] border-0 md:border border-white/10 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 md:p-8 border-b border-white/5 flex items-center justify-between gap-3 bg-white/2">
          <div className="flex flex-col">
            <h2 className="text-xl md:text-2xl font-black tracking-tight">Gestión de Personas</h2>
            <p className="text-[10px] uppercase font-bold text-accent tracking-widest">Base de datos de ciudadanos</p>
          </div>
          <button className="danger tap min-w-[44px] p-2! md:p-3! rounded-2xl shrink-0" onClick={onClose} aria-label="Cerrar">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end mb-6 md:mb-8">
            <div className="flex-1">
              <label>Buscar Ciudadano</label>
              <input 
                placeholder="Nombre, Apellido o DNI..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white/5"
                enterKeyHint="search"
              />
            </div>
            <button className="primary tap px-8! sm:h-[46px]" type="submit" disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </form>

          {/* Celular: tarjetas */}
          <ul className="md:hidden space-y-2">
            {people.length === 0 && (
              <li className="py-12 text-center text-sm text-muted">{status || 'Buscá por nombre, apellido o DNI'}</li>
            )}
            {people.map(p => (
              <li key={p.id} className="rounded-xl border border-white/10 bg-white/3 px-4 py-3 space-y-2">
                <div>
                  <p className="text-white font-semibold break-words">{p.apellido_nombre}</p>
                  <p className="text-sm text-muted font-mono">DNI {p.dni}</p>
                </div>
                {(p.telefono || p.domicilio) && (
                  <p className="text-sm text-white/70 break-words">
                    {[p.telefono, p.domicilio].filter(Boolean).join(' · ')}
                  </p>
                )}
                <button className="secondary tap w-full text-sm" onClick={() => { onViewPerson(p.id); onClose(); }}>
                  Ver ficha
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden md:block tableWrap bg-black/20">
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
        <div className="p-3 md:p-4 bg-black/20 text-center border-t border-white/5 pb-seguro">
          <p className="text-xs text-muted font-semibold">Resultados: {people.length}</p>
        </div>
      </div>
    </div>
  );
};

export default PeopleModal;
