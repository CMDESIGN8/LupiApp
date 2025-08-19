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

    // Crear perfil manualmente por si el trigger falla
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            username: username,
            wallet_address: `${username.toLowerCase()}.lupi`,
            lupicoins: 100
          }
        ]);

      if (profileError) {
        console.warn('Profile creation warning:', profileError);
      }
    } catch (profileError) {
      console.warn('Profile creation failed, but auth succeeded:', profileError);
    }

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