import { supabase } from '../lib/supabase';

export const playerService = {
  // Crear un nuevo jugador
  createPlayer: async (userId, playerData) => {
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
          skill_points: 10 // Puntos iniciales
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
  },

  // Obtener jugador por ID de usuario
  getPlayerByUserId: async (userId) => {
    const { data, error } = await supabase
      .from('players')
      .select(`
        *,
        player_skills (*)
      `)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  // Actualizar skills del jugador
  updateSkills: async (playerId, skills) => {
    const { data, error } = await supabase
      .from('player_skills')
      .update(skills)
      .eq('player_id', playerId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};