import { supabase } from '../lib/supabase';

export const authService = {
  // Registro de usuario
  signUp: async (email, password, username) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username
        }
      }
    });
    
    if (authError) throw authError;
    return authData;
  },

  // Inicio de sesión
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  },

  // Cerrar sesión
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Obtener usuario actual
  getCurrentUser: () => {
    return supabase.auth.getUser();
  }
};