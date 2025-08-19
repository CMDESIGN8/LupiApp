import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './HomeScreen.css'

export const HomeScreen = ({ session }) => {
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPlayerData()
  }, [session])

  const loadPlayerData = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select(`
          *,
          player_skills (*)
        `)
        .eq('user_id', session.user.id)
        .single()

      if (error) throw error
      setPlayer(data)
    } catch (error) {
      console.error('Error loading player:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Cargando datos del jugador...</div>
  }

  return (
    <div className="home-container">
      <div className="welcome-section">
        <h2>¡Bienvenido{aplayer ? `, ${player.full_name}` : ''}!</h2>
        <p>Nivel {player?.level || 1} - {player?.sport || 'Deporte'}</p>
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

          <div className="skills-section">
            <h4>Habilidades</h4>
            {player.player_skills && (
              <div className="skills-list">
                <div className="skill-item">
                  <span>Fuerza: {player.player_skills.fuerza}</span>
                </div>
                <div className="skill-item">
                  <span>Velocidad: {player.player_skills.velocidad}</span>
                </div>
                {/* Agrega más habilidades aquí */}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="no-player">
          <p>¡Aún no tienes un personaje!</p>
          <button className="create-player-btn">
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
  )
}