import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase'; // Asumiendo esta ruta para el cliente

export const useProfile = () => {
  const [profile, setProfile] = useState(null);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAreas = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('areas')
        .select('*')
        .eq('active', true)
        .order('nombre');
      
      if (error) throw error;
      setAreas(data || []);
    } catch (err) {
      console.error('Error al cargar áreas:', err);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*, areas(id, name)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data && data.is_active === false) {
        await supabase.auth.signOut();
        return;
      }

      setProfile(data);
    } catch (err) {
      console.error('Error al cargar perfil:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadAreas();
  }, [loadProfile, loadAreas]);

  return { profile, areas, loading, refetchAreas: loadAreas };
};