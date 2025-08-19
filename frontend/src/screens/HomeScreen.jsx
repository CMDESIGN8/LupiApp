import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { playerService } from '../services/playerService';
import { authService } from '../services/authService'; // ← Importar authService
import './HomeScreen.css';

export const HomeScreen = ({ session, onSignOut }) => { // ← Añadir onSignOut prop
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

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      onSignOut(); // ← Llamar a la función padre para actualizar el estado
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
                onClick={handleSignOut}
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

      {/* ... resto del código igual ... */}
    </div>
  );
};