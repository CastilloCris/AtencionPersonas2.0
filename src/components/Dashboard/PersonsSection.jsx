import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

const PersonsSection = ({ onViewPerson }) => {
  const [search, setSearch] = useState('');
  const [people, setPeople] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search || search.length < 2) {
      setStatus('Escribí un DNI (7+) o un nombre (2+ letras) para buscar.');
      return;
    }

    setLoading(true);
    setStatus('Buscando personas...');

    const sDni = search.replace(/\D/g, "");
    const hasLetters = /[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(search);

    let q = supabase
      .from('persons')
      .select('id, dni, apellido_nombre, telefono, domicilio, updated_at')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (sDni.length >= 7 && !hasLetters) {
      q = q.eq('dni', sDni);
    } else if (hasLetters) {
      q = q.ilike('apellido_nombre', `%${search}%`);
    } else if (sDni.length >= 7 && hasLetters) {
      q = q.or(`dni.ilike.%${sDni}%,apellido_nombre.ilike.%${search}%`);
    }

    const { data, error } = await q;

    if (error) {
      setStatus(`Error: ${error.message}`);
    } else {
      setPeople(data || []);
      setStatus(`OK. ${data?.length || 0} persona(s).`);
    }
    setLoading(false);
  };

  return (
    <section id="sectionPersons" className="sectionBlock card">
      <h2>Personas</h2>
      <form onSubmit={handleSearch} className="row items-end!">
        <div className="flex-1 min-w-[240px]">
          <label>Buscar por DNI o nombre</label>
          <input 
            placeholder="Ej: 30123456 o Pérez" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="secondary" type="submit" disabled={loading}>
          Buscar personas
        </button>
      </form>

      <p className={`muted mt-2 ${loading ? 'loading' : ''}`}>{status}</p>

      <div className="tableWrap mt-4">
        <table>
          <thead>
            <tr>
              <th>DNI</th>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Domicilio</th>
              <th>Actualizado</th>
            </tr>
          </thead>
          <tbody>
            {people.length > 0 ? people.map(p => (
              <tr key={p.id}>
                <td>{p.dni}</td>
                <td>
                  <button 
                    type="button" 
                    className="secondary text-left p-1! hover:underline"
                    onClick={() => onViewPerson(p.id)}
                  >
                    {p.apellido_nombre}
                  </button>
                </td>
                <td>{p.telefono || '-'}</td>
                <td>{p.domicilio || '-'}</td>
                <td>{p.updated_at ? new Date(p.updated_at).toLocaleDateString() : '-'}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5" className="text-center muted">No se encontraron personas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default PersonsSection;
