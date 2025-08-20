import { useState, useEffect } from 'react';

// Se carga la biblioteca de Supabase desde un CDN para evitar errores de compilación.
// Esto hace que la variable 'supabase' esté disponible globalmente.
const SupabaseLoader = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    document.body.appendChild(script);
  }, []);
  return null;
};

const positions = ['Arquero', 'Defensa', 'Mediocampista', 'Delantero', 'Neutro'];
const sports = ['Fútbol', 'Voley', 'Handball', 'Jockey', 'Rugby', 'Fitness'];
const skillNames = ["Fuerza", "Resistencia", "Técnica", "Velocidad", "Dribling", "Pase", "Tiro", "Defensa", "Liderazgo", "Estrategia", "Inteligencia"];
const initialSkillPoints = 5;

const App = () => {
  const [session, setSession] = useState(null);
  const [view, setView] = useState('auth'); // 'auth', 'create_character', 'dashboard'
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [sport, setSport] = useState(sports[0]);
  const [position, setPosition] = useState(positions[0]);
  const [availablePoints, setAvailablePoints] = useState(initialSkillPoints);
  const [skills, setSkills] = useState(skillNames.reduce((acc, skill) => ({ ...acc, [skill]: 50 }), {}));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Accede a la variable global 'supabase' después de que el script se cargue.
  const supabase = window.supabase ? window.supabase.createClient(
    // Por favor, reemplaza estos marcadores de posición con tu URL y clave anónima de Supabase.
    "https://tu_url_de_supabase.supabase.co", 
    "tu_clave_anonima"
  ) : null;

  // Escucha los cambios en la sesión de Supabase
  useEffect(() => {
    if (!supabase) return; // Espera a que Supabase esté disponible
    
    // Intenta obtener la sesión actual al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkProfile(session.user.id);
      } else {
        setView('auth');
      }
    });

    // Suscribe a los cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkProfile(session.user.id);
      } else {
        setView('auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Verifica si el usuario ya tiene un personaje creado
  const checkProfile = async (userId) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setView('dashboard');
    } else {
      setView('create_character');
    }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Inicio de sesión exitoso. Redirigiendo...');
    }
    setLoading(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Registro exitoso. Revisa tu correo electrónico para confirmar.');
    }
    setLoading(false);
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
  
    try {
      // 1. Crear el registro del jugador
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert([
          {
            id: session.user.id,
            username,
            level: 1,
            position,
            sport,
            lupicoins: 50,
            skill_points: 0, 
            club_id: null,
          }
        ])
        .select();
  
      if (playerError) throw playerError;
  
      // 2. Crear los registros de las habilidades del jugador
      const skillInserts = Object.entries(skills).map(([skill_name, skill_value]) => ({
        player_id: session.user.id,
        skill_name,
        skill_value,
      }));
  
      const { data: skillsData, error: skillsError } = await supabase
        .from('player_skills')
        .insert(skillInserts)
        .select();
  
      if (skillsError) throw skillsError;
  
      setSuccess('Personaje creado con éxito. ¡Bienvenido a Lupi App!');
      setView('dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  

  const handleSkillChange = (skill, value) => {
    const newPoints = availablePoints - value;
    if (newPoints >= 0) {
      setAvailablePoints(newPoints);
      setSkills(prev => ({ ...prev, [skill]: prev[skill] + value }));
    } else {
      setError('No tienes suficientes puntos de habilidad.');
    }
  };

  const renderAuth = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-100 p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-3xl font-bold text-center text-stone-800 mb-6">Lupi App</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {success && <p className="text-emerald-500 text-center mb-4">{success}</p>}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-md hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {loading ? 'Cargando...' : 'Iniciar Sesión'}
          </button>
        </form>
        <button
          onClick={handleSignup}
          disabled={loading}
          className="w-full mt-4 bg-gray-200 text-stone-800 font-semibold py-3 rounded-md hover:bg-gray-300 transition disabled:opacity-50"
        >
          {loading ? 'Cargando...' : 'Registrarse'}
        </button>
      </div>
    </div>
  );

  const renderCreateCharacter = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-100 p-4">
      <div className="w-full max-w-xl p-8 bg-white rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-3xl font-bold text-center text-stone-800 mb-6">Crea tu Personaje</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {success && <p className="text-emerald-500 text-center mb-4">{success}</p>}
        
        <form onSubmit={handleCreateAccount} className="space-y-6">
          <div className="flex flex-col">
            <label className="text-stone-700 font-medium mb-1">Nombre de Usuario</label>
            <input
              type="text"
              placeholder="Nombre de usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div className="flex flex-col">
            <label className="text-stone-700 font-medium mb-1">Deporte</label>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="w-full p-3 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {sports.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          
          <div className="flex flex-col">
            <label className="text-stone-700 font-medium mb-1">Posición</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full p-3 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {positions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          
          <div className="bg-gray-100 p-4 rounded-lg">
            <h4 className="font-bold text-lg mb-2">Asignar Puntos de Habilidad</h4>
            <p className="text-sm text-stone-600 mb-4">Puntos disponibles: <span className="font-bold text-emerald-600">{availablePoints}</span></p>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(skills).map(([skillName, skillValue]) => (
                <div key={skillName} className="flex items-center justify-between">
                  <span>{skillName}: {skillValue}</span>
                  <button
                    type="button"
                    onClick={() => handleSkillChange(skillName, 1)}
                    disabled={availablePoints <= 0}
                    className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-full font-bold hover:bg-emerald-200 transition disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || availablePoints > 0}
            className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-md hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {loading ? 'Cargando...' : 'Crear Personaje'}
          </button>
        </form>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="p-8 text-center">
      <h1 className="text-4xl font-bold text-stone-800">¡Bienvenido a Lupi App!</h1>
      <p className="text-xl text-stone-600 mt-4">Tu personaje ha sido creado. ¡Pronto estará disponible el dashboard!</p>
      <button
        onClick={() => supabase.auth.signOut()}
        className="mt-8 bg-red-500 text-white font-semibold py-2 px-6 rounded-md hover:bg-red-600 transition"
      >
        Cerrar Sesión
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-stone-100">
        <div className="text-emerald-600 text-2xl font-bold animate-pulse">Cargando...</div>
      </div>
    );
  }

  return (
    <>
      <SupabaseLoader />
      {
        (() => {
          switch (view) {
            case 'auth':
              return renderAuth();
            case 'create_character':
              return renderCreateCharacter();
            case 'dashboard':
              return renderDashboard();
            default:
              return null;
          }
        })()
      }
    </>
  );
};

export default App;
