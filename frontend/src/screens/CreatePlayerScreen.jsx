import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { playerService } from '../services/playerService';
import './CreatePlayerScreen.css';

export const CreatePlayerScreen = ({ session, onPlayerCreated }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    sport: 'futbol',
    position: 'mediocampista'
  });
  
  const [skills, setSkills] = useState({
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
  });
  
  const [remainingPoints, setRemainingPoints] = useState(10);
  const [loading, setLoading] = useState(false);

  // Deportes y posiciones disponibles
  const sports = [
    { value: 'futbol', label: 'Fútbol ⚽', positions: ['arquero', 'defensor', 'mediocampista', 'delantero'] },
    { value: 'voley', label: 'Vóley 🏐', positions: ['armador', 'central', 'punta', 'libero'] },
    { value: 'handball', label: 'Handball 🤾', positions: ['arquero', 'central', 'lateral', 'pivote'] },
    { value: 'hockey', label: 'Hockey 🏑', positions: ['arquero', 'defensor', 'mediocampista', 'delantero'] },
    { value: 'rugby', label: 'Rugby 🏉', positions: ['pilar', 'hooker', 'segunda linea', 'ala', 'medio melé', 'apertura', 'centro', 'wing', 'fullback'] },
    { value: 'fitness', label: 'Fitness 💪', positions: ['neutro'] }
  ];

  const skillLabels = {
    fuerza: 'Fuerza 💪',
    resistencia: 'Resistencia 🏃',
    tecnica: 'Técnica 🎯',
    velocidad: 'Velocidad ⚡',
    dribling: 'Dribling 🦶',
    pase: 'Pase 🎾',
    tiro: 'Tiro ⚽',
    defensa: 'Defensa 🛡️',
    liderazgo: 'Liderazgo 👑',
    estrategia: 'Estrategia 🧠',
    inteligencia: 'Inteligencia 📚'
  };

  // Bonificaciones por posición
  const positionBonuses = {
    arquero: { defensa: 3, fuerza: 2 },
    defensor: { defensa: 3, fuerza: 2, resistencia: 1 },
    mediocampista: { pase: 3, tecnica: 2, resistencia: 1 },
    delantero: { tiro: 3, dribling: 2, velocidad: 1 },
    neutro: { resistencia: 2, fuerza: 2, inteligencia: 2 }
  };

  const handleSkillChange = (skill, value) => {
    const currentValue = skills[skill];
    const newValue = Math.max(1, Math.min(10, value));
    const difference = newValue - currentValue;

    if (difference <= remainingPoints) {
      setSkills(prev => ({ ...prev, [skill]: newValue }));
      setRemainingPoints(prev => prev - difference);
    }
  };

  const applyPositionBonus = (position) => {
    const bonus = positionBonuses[position] || {};
    const newSkills = { ...skills };
    let pointsUsed = 0;

    Object.entries(bonus).forEach(([skill, bonusValue]) => {
      const currentValue = newSkills[skill];
      const newValue = Math.min(10, currentValue + bonusValue);
      pointsUsed += (newValue - currentValue);
      newSkills[skill] = newValue;
    });

    setSkills(newSkills);
    setRemainingPoints(prev => prev - pointsUsed);
  };

  const handlePositionChange = (position) => {
    setFormData(prev => ({ ...prev, position }));
    applyPositionBonus(position);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const playerData = {
        fullName: formData.fullName,
        sport: formData.sport,
        position: formData.position,
        skills: skills
      };

      const newPlayer = await playerService.createPlayer(session.user.id, playerData);
      onPlayerCreated(newPlayer);
      
    } catch (error) {
      console.error('Error creating player:', error);
      alert('Error al crear personaje: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-player-container">
      <div className="create-player-header">
        <h1>⚽ Crear Personaje</h1>
        <p>Distribuye tus {remainingPoints} puntos restantes</p>
      </div>

      <form onSubmit={handleSubmit} className="player-form">
        {/* Información básica */}
        <div className="form-section">
          <h2>Información Básica</h2>
          
          <div className="input-group">
            <label>Nombre completo *</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              required
              placeholder="Ej: Lionel Messi"
              maxLength={50}
            />
          </div>

          <div className="input-group">
            <label>Deporte *</label>
            <select
              value={formData.sport}
              onChange={(e) => setFormData(prev => ({ ...prev, sport: e.target.value, position: '' }))}
              required
            >
              {sports.map(sport => (
                <option key={sport.value} value={sport.value}>
                  {sport.label}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>Posición *</label>
            <select
              value={formData.position}
              onChange={(e) => handlePositionChange(e.target.value)}
              required
            >
              <option value="">Selecciona una posición</option>
              {sports.find(s => s.value === formData.sport)?.positions.map(pos => (
                <option key={pos} value={pos}>
                  {pos.charAt(0).toUpperCase() + pos.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Distribución de skills */}
        <div className="form-section">
          <h2>Habilidades ⚡</h2>
          <div className="skills-grid">
            {Object.entries(skills).map(([skill, value]) => (
              <div key={skill} className="skill-item">
                <label>{skillLabels[skill]}</label>
                <div className="skill-controls">
                  <button
                    type="button"
                    onClick={() => handleSkillChange(skill, value - 1)}
                    disabled={value <= 1 || remainingPoints >= 10}
                    className="skill-btn"
                  >
                    -
                  </button>
                  <span className="skill-value">{value}</span>
                  <button
                    type="button"
                    onClick={() => handleSkillChange(skill, value + 1)}
                    disabled={remainingPoints <= 0 || value >= 10}
                    className="skill-btn"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resumen y botón de crear */}
        <div className="form-section">
          <div className="summary">
            <h3>Resumen</h3>
            <p>Puntos restantes: <strong>{remainingPoints}</strong></p>
            {formData.position && positionBonuses[formData.position] && (
              <div className="bonus-info">
                <p>Bonificación de {formData.position}:</p>
                <ul>
                  {Object.entries(positionBonuses[formData.position]).map(([skill, bonus]) => (
                    <li key={skill}>+{bonus} {skillLabels[skill]}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={remainingPoints > 0 || loading || !formData.fullName}
            className="create-button"
          >
            {loading ? 'Creando...' : 'Crear Personaje'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePlayerScreen;