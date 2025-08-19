import { supabase } from '../lib/supabase';

export const playerService = {
  // Obtener jugador por ID de usuario (con manejo de errores)
  getPlayerByUserId: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select(`
          *,
          player_skills (*)
        `)
        .eq('user_id', userId)
        .maybeSingle();  // ← Usar maybeSingle en lugar de single

      if (error) {
        console.error('Error fetching player:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getPlayerByUserId:', error);
      throw error;
    }
  },

  // Crear un nuevo jugador
  createPlayer: async (userId, playerData) => {
    try {
      const { data, error } = await supabase
        .from('players')
        .insert([
          {
            user_id: userId,
            full_name: playerData.fullName,
            sport: playerData.sport,
            position: playerData.position,
            level: 1,
            experience: 0,
            skill_points: 10
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Crear skills iniciales
      await supabase
        .from('player_skills')
        .insert([
          {
            player_id: data.id,
            fuerza: playerData.position === 'defensor' ? 5 : 1,
            resistencia: 1,
            tecnica: 1,
            velocidad: 1,
            dribling: playerData.position === 'delantero' ? 5 : 1,
            pase: playerData.position === 'mediocampista' ? 5 : 1,
            tiro: playerData.position === 'delantero' ? 5 : 1,
            defensa: playerData.position === 'defensor' ? 5 : 1,
            liderazgo: 1,
            estrategia: 1,
            inteligencia: 1
          }
        ]);

      return data;
    } catch (error) {
      console.error('Error creating player:', error);
      throw error;
    }
  },

  // Crear jugador por defecto si no existe
  createDefaultPlayer: async (userId, username = 'Jugador') => {
    try {
      const { data: player, error } = await supabase
        .from('players')
        .insert([
          {
            user_id: userId,
            full_name: username,
            sport: 'futbol',
            position: 'mediocampista',
            level: 1,
            experience: 0,
            skill_points: 10
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Crear skills iniciales
      await supabase
        .from('player_skills')
        .insert([
          {
            player_id: player.id,
            fuerza: 1,
            resistencia: 1,
            tecnica: 1,
            velocidad: 1,
            dribling: 1,
            pase: 1,
            tiro: 1,
            defensa: 1,
            liderazgo: 1,
            estrategia: 1,
            inteligencia: 1
          }
        ]);

      // Devolver el jugador completo con skills
      const { data: fullPlayer } = await supabase
        .from('players')
        .select(`
          *,
          player_skills (*)
        `)
        .eq('id', player.id)
        .single();

      return fullPlayer;
    } catch (error) {
      console.error('Error creating default player:', error);
      throw error;
    }
  }
};