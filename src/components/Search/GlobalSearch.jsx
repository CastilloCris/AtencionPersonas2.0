import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

const GlobalSearch = ({ onViewPerson }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ persons: [], family: [], cases: [], prestations: [] });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Ingresá un término para buscar.');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    setStatus('Buscando...');

    try {
      const term = query.trim();
      const isOnlyNumbers = /^\d+$/.test(term);
      const hasLetters = /[a-zA-Zà-ÿ]/.test(term);

      let persons = [];

      if (isOnlyNumbers) {
        // Búsqueda exacta por DNI
        const { data } = await supabase
          .from('persons')
          .select('*')
          .eq('dni', term)
          .limit(10);
        persons = data || [];
      } else if (hasLetters && !isOnlyNumbers) {
        // Búsqueda solo por nombre
        const { data } = await supabase
          .from('persons')
          .select('*')
          .ilike('apellido_nombre', `%${term}%`)
          .limit(10);
        persons = data || [];
      } else {
        // Ambiguo: combinar ambas búsquedas y deduplicar por id
        const [byDni, byName] = await Promise.all([
          supabase.from('persons').select('*').eq('dni', term).limit(10),
          supabase.from('persons').select('*').ilike('apellido_nombre', `%${term}%`).limit(10)
        ]);
        const seen = new Set();
        for (const p of [...(byDni.data || []), ...(byName.data || [])]) {
          if (!seen.has(p.id)) { seen.add(p.id); persons.push(p); }
        }
      }

      // Búsqueda de familiares y casos en paralelo (sin cambios en su lógica)
      const [fRes, cRes] = await Promise.all([
        supabase.from('family_members').select('*')
          .or(`dni.ilike.%${term}%,apellido_nombres.ilike.%${term}%`).limit(10),
        supabase.from('cases_readable').select('*')
          .or(`dni.ilike.%${term}%,apellido_nombre.ilike.%${term}%,motivo.ilike.%${term}%`).limit(10),
      ]);

      setResults({
        persons,
        family: fRes.data || [],
        cases: cRes.data || [],
        prestations: []
      });

      const total = persons.length + (fRes.data?.length || 0) + (cRes.data?.length || 0);
      setStatus(`Resultados: ${total} registro(s).`);
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="screenSearch" className="screen active space-y-6">
      <section className="card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <div className="flex flex-col">
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">Búsqueda Global</h2>
            <p className="text-[10px] md:text-xs font-bold text-muted uppercase tracking-widest mt-1">Localizá registros en todo el sistema</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted">Término de búsqueda</label>
            <input 
              placeholder="Buscar por DNI o apellido..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="py-3! text-sm min-h-[44px]"
            />
          </div>
          <button className="primary px-8! py-3! text-xs font-black uppercase tracking-widest min-h-[44px]" type="submit" disabled={loading}>
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>
        <p className={`text-[10px] font-black uppercase tracking-widest mt-4 ${loading ? 'loading text-accent' : 'text-muted'}`}>{status}</p>

        {results.persons.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <div className="w-2 h-2 rounded-full bg-accent"></div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight">Personas encontradas</h3>
            </div>
            <div className="tableWrap overflow-x-auto shadow-xl">
              <table className="w-full min-w-[500px]">
                <thead><tr><th className="py-4">DNI</th><th>Nombre completo</th><th>Acción</th></tr></thead>
                <tbody>
                  {results.persons.map(p => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="font-mono text-xs text-accent font-bold py-4">{p.dni}</td>
                      <td className="text-xs font-bold text-white uppercase">{p.apellido_nombre}</td>
                      <td><button className="secondary py-2! px-4! text-[10px] font-black uppercase tracking-widest min-h-[36px]" onClick={() => onViewPerson(p.id)}>Ver ficha</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {results.cases.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <div className="w-2 h-2 rounded-full bg-accent"></div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight">Casos relacionados</h3>
            </div>
            <div className="tableWrap overflow-x-auto shadow-xl">
              <table className="w-full min-w-[600px]">
                <thead><tr><th className="py-4">Fecha</th><th>Área</th><th>Persona</th><th>Acción</th></tr></thead>
                <tbody>
                  {results.cases.map(c => (
                    <tr key={c.id} className="hover:bg-white/5 transition-colors">
                      <td className="text-[10px] font-mono py-4 opacity-60">{new Date(c.actual_date || c.created_at).toLocaleDateString()}</td>
                      <td><span className="pill text-[9px]">{c.area_name}</span></td>
                      <td className="text-xs font-bold text-white uppercase">{c.apellido_nombre}</td>
                      <td><button className="secondary py-2! px-4! text-[10px] font-black uppercase tracking-widest min-h-[36px]" onClick={() => onViewPerson(c.person_id)}>Ver persona</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </section>
  );
};

export default GlobalSearch;