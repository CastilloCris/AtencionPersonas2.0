import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const usePersonSearch = () => {
  const [socialAlerts, setSocialAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [searchStatus, setSearchStatus] = useState('idle');

  const fetchSocialAlerts = useCallback(async (personId) => {
    try {
      const { data, error } = await supabase
        .from('social_alerts')
        .select('*')
        .eq('person_id', personId);
      
      if (!error && data?.length > 0) {
        setSocialAlerts(data);
        setShowAlerts(true);
      }
    } catch (err) {
      console.error('Error al cargar alertas sociales:', err);
    }
  }, []);

  const findPerson = useCallback(async (dni) => {
    if (!dni) return null;
    setSearchStatus('searching');
    
    try {
      const { data, error } = await supabase
        .from('persons')
        .select('*')
        .eq('dni', dni)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignorar si simplemente no existe

      if (data) {
        await fetchSocialAlerts(data.id);
      }
      
      setSearchStatus('success');
      return data;
    } catch (err) {
      setSearchStatus('error');
      return null;
    }
  }, [fetchSocialAlerts]);

  const dismissAlerts = () => setShowAlerts(false);

  return { findPerson, socialAlerts, showAlerts, dismissAlerts, searchStatus };
};