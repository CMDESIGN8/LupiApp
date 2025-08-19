import { supabase } from '../lib/supabase';

export const clubService = {
  // Obtener clubes del usuario
  getUserClubs: async (userId) => {
    const { data, error } = await supabase
      .from('club_memberships')
      .select(`
        clubs (*)
      `)
      .eq('player_id', userId);

    if (error) throw error;
    return data;
  }
};