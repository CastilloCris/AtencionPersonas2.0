import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const useCases = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'

  const fetchCases = useCallback(async (filters = {}) => {
    setLoading(true);
    setStatus('loading');

    const applyFilters = (query) => {
      if (filters.dni) query = query.ilike('documento', `%${filters.dni}%`);
      if (filters.name) query = query.ilike('nombre_completo', `%${filters.name}%`);
      if (filters.areaId) query = query.eq('area_id', filters.areaId);
      if (filters.from) query = query.gte('created_at', filters.from);
      if (filters.to) query = query.lte('created_at', filters.to);
      return query.order('created_at', { ascending: false });
    };

    try {
      // Intento inicial con la vista optimizada
      let { data, error } = await applyFilters(supabase.from('cases_readable').select('*'));

      if (error) {
        console.warn('Falla en cases_readable, reintentando con tabla base cases');
        // Fallback a la tabla base si la vista no existe o falla
        const fallback = await applyFilters(supabase.from('cases').select('*'));
        if (fallback.error) throw fallback.error;
        data = fallback.data;
      }

      setCases(data || []);
      setStatus('success');
    } catch (err) {
      console.error('Error al obtener casos:', err);
      setStatus('error');
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { cases, loading, status, fetchCases };
};