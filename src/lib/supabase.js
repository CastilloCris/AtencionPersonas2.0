import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Cliente descartable que NO guarda sesión.
 * Se usa para dar de alta usuarios: si signUp se hace con el cliente principal,
 * Supabase puede iniciar sesión como el usuario nuevo y el admin pierde la suya.
 */
export const crearClienteTemporal = () =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'ficha-social-alta-temporal',
    },
  });