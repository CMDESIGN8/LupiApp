import { useState, useEffect } from 'react';
import { playerService } from '../services/playerService';
import './HomeScreen.css';

export const HomeScreen = ({ session }) => {
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlayerData();
  }, [session]);

  const loadPlayerData = async () => {
    try {
      const playerData = await playerService.getPlayerByUserId(session.user.id);
      setPlayer(playerData);
    } catch (error) {
      console.error('Error loading player:', error);
      // No mostrar error al usuario, solo dejar player como null
    } finally {
      setLoading(false);
    }
  };

  const createPlayer = async () => {
    try {
      // Obtener username del perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single();

      const newPlayer = await playerService.createDefaultPlayer(
        session.user.id, 
        profile?.username || 'Jugador'
      );
      setPlayer(newPlayer);
    } catch (error) {
      console.error('Error creating player:', error);
      alert('Error al crear personaje: ' + error.message);
    }
  };

  if (loading) {
    return <div className="loading">Cargando datos del jugador...</div>;
  }

  return (
    <div className="home-container">
      <div className="welcome-section">
        <h2>¡Bienvenido{player ? `, ${player.full_name}` : ''}!</h2>
        <p>Nivel {player?.level || 1} - {player?.sport || 'Sin deporte'}</p>
      </div>

      {player ? (
        <div className="player-stats">
          <h3>Tus Estadísticas</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">{player.experience}</span>
              <span className="stat-label">Experiencia</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{player.skill_points}</span>
              <span className="stat-label">Puntos de Skill</span>
            </div>
          </div>

          {player.player_skills && (
            <div className="skills-section">
              <h4>Habilidades</h4>
              <div className="skills-list">
                <div className="skill-item">
                  <span>Fuerza: {player.player_skills.fuerza}</span>
                </div>
                <div className="skill-item">
                  <span>Velocidad: {player.player_skills.velocidad}</span>
                </div>
                <div className="skill-item">
                  <span>Técnica: {player.player_skills.tecnica}</span>
                </div>
                <div className="skill-item">
                  <span>Defensa: {player.player_skills.defensa}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="no-player">
          <p>¡Aún no tienes un personaje!</p>
          <button className="create-player-btn" onClick={createPlayer}>
            Crear Personaje
          </button>
        </div>
      )}
    </div>
  );
};