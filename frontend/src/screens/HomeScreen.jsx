import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { playerService } from '../services/playerService';
import '/src/screens/HomeScreen.css';


export const HomeScreen = ({ session, onSignOut }) => {
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    loadPlayerData();
  }, [session]);

  const loadPlayerData = async () => {
    try {
      const playerData = await playerService.getPlayerByUserId(session.user.id);
      setPlayer(playerData);
    } catch (error) {
      console.error('Error loading player:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPlayer = async () => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        const newPlayer = await playerService.createDefaultPlayer(
          session.user.id, 
          'Jugador'
        );
        setPlayer(newPlayer);
        return;
      }

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


  // Agrega este estado
const [showCreateScreen, setShowCreateScreen] = useState(false);

// Agrega esta función
const handlePlayerCreated = (newPlayer) => {
  setPlayer(newPlayer);
  setShowCreateScreen(false);
};

// Modifica el render para mostrar la pantalla correcta
if (showCreateScreen) {
  return <CreatePlayerScreen 
    session={session} 
    onPlayerCreated={handlePlayerCreated}
  />;
}

  // ✅ FUNCIÓN CORREGIDA - Usando supabase directamente
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      onSignOut();
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Error al cerrar sesión: ' + error.message);
    }
  };

  if (loading) {
    return <div className="loading">Cargando datos del jugador...</div>;
  }

  return (
    <div className="home-container">
      {/* Header con botón de cerrar sesión */}
      <div className="home-header">
        <h1>⚽ Lupi App</h1>
        <button 
          className="logout-btn"
          onClick={() => setShowLogoutConfirm(true)}
          title="Cerrar sesión"
        >
          👤
        </button>
      </div>

      {/* Modal de confirmación de cierre de sesión */}
      {showLogoutConfirm && (
        <div className="logout-modal">
          <div className="logout-modal-content">
            <h3>¿Cerrar sesión?</h3>
            <p>Estás conectado como: {session.user.email}</p>
            <div className="logout-modal-buttons">
              <button 
                className="logout-confirm-btn"
                onClick={handleSignOut} // ✅ Usa la función corregida
              >
                Sí, cerrar sesión
              </button>
              <button 
                className="logout-cancel-btn"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="welcome-section">
        <h2>¡Bienvenido{player ? `, ${player.full_name}` : ''}!</h2>
        <p>Nivel {player?.level || 1} - {player?.sport || 'Sin deporte'}</p>
        <small>Conectado como: {session.user.email}</small>
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
          // En el botón de crear personaje, cambia a:
<button className="create-player-btn" onClick={() => setShowCreateScreen(true)}>
  Crear Personaje
</button>
        </div>
      )}

      <div className="quick-actions">
        <h3>Acciones Rápidas</h3>
        <div className="action-buttons">
          <button className="action-btn">🏟️ Partidos</button>
          <button className="action-btn">👥 Clubes</button>
          <button className="action-btn">🛒 Tienda</button>
        </div>
      </div>
    </div>
  );
};