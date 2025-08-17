import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where, // No se usa directamente en este ejemplo, pero es útil para filtros
  addDoc, // No se usa directamente en este ejemplo, pero es útil para agregar documentos
  getDocs, // No se usa directamente en este ejemplo, pero es útil para obtener documentos una vez
} from 'firebase/firestore';

// Accede a las variables de entorno definidas en Render
// Para entornos locales (npm run dev), estas deben estar en un archivo .env.local
// con el prefijo VITE_ si usas Vite, o REACT_APP_ si usas Create React App.
// En Render, simplemente las configuras con el nombre REACT_APP_...
const appId = process.env.REACT_APP_APP_ID || 'default-lupi-app-id'; // 'default-lupi-app-id' es un fallback local
const firebaseConfig = JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG || '{}'); // '{}' es un fallback local
const initialAuthToken = process.env.REACT_APP_INITIAL_AUTH_TOKEN || null; // null es un fallback local

// Componente principal de la aplicación Lupi App
const App = () => {
  // Estados para la instancia de Firebase, el usuario, y los datos del juego
  const [app, setApp] = useState(null);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userData, setUserData] = useState(null);
  const [missions, setMissions] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- 1. Inicialización de Firebase y Autenticación ---
  useEffect(() => {
    const initFirebase = async () => {
      try {
        // Verifica que firebaseConfig tenga al menos una propiedad para evitar errores de inicialización
        if (Object.keys(firebaseConfig).length === 0) {
          console.error("Firebase config is empty. Please check your environment variables.");
          setError("Error de configuración de Firebase. Contacta al soporte.");
          setLoading(false);
          return;
        }

        const firebaseApp = initializeApp(firebaseConfig);
        const firestoreDb = getFirestore(firebaseApp);
        const firebaseAuth = getAuth(firebaseApp);

        setApp(firebaseApp);
        setDb(firestoreDb);
        setAuth(firebaseAuth);

        // Autenticación con el token inicial o de forma anónima
        if (initialAuthToken) {
          await signInWithCustomToken(firebaseAuth, initialAuthToken);
        } else {
          await signInAnonymously(firebaseAuth);
        }

        // Observar cambios en el estado de autenticación para obtener el userId
        onAuthStateChanged(firebaseAuth, (user) => {
          if (user) {
            setUserId(user.uid);
            console.log('Usuario autenticado:', user.uid);
          } else {
            // Genera un ID de usuario anónimo si no hay token o el usuario no está autenticado
            // Esto es un fallback, en producción siempre debería haber un user.uid después de signInAnonymously
            setUserId(crypto.randomUUID());
            console.log('Usuario anónimo generado (fallback):', userId);
          }
          setLoading(false); // La carga se completa una vez que se resuelve la autenticación
        });
      } catch (err) {
        console.error("Error al inicializar Firebase o autenticar:", err);
        setError("Error al cargar la aplicación. Por favor, inténtelo de nuevo más tarde.");
        setLoading(false);
      }
    };

    initFirebase();
  }, []); // Se ejecuta solo una vez al montar el componente

  // --- 2. Carga de Datos del Usuario y Misiones ---
  useEffect(() => {
    // Solo procede si la base de datos y el ID de usuario están disponibles y no hay errores previos
    if (!db || !userId || error) return;

    // Escuchar cambios en los datos del usuario en tiempo real
    // La ruta es artifacts/{appId}/users/{userId}/profile/userData
    const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userData');
    const unsubscribeUserData = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);
        console.log("Datos del usuario cargados/actualizados:", data);
        // Si es un usuario nuevo (o faltan campos vitales), inicializar datos
        if (typeof data.xp === 'undefined' || typeof data.level === 'undefined' || typeof data.coins === 'undefined') {
          initializeNewUser(userId, db);
        }
      } else {
        // Inicializar datos para un nuevo usuario si el documento no existe
        initializeNewUser(userId, db);
      }
    }, (err) => {
      console.error("Error al escuchar datos del usuario:", err);
      setError("Error al cargar los datos de tu perfil. Verifica las reglas de seguridad.");
    });

    // Escuchar cambios en las misiones públicas en tiempo real
    // La ruta es artifacts/{appId}/public/data/missions
    const missionsColRef = collection(db, `artifacts/${appId}/public/data/missions`);
    const unsubscribeMissions = onSnapshot(missionsColRef, (snapshot) => {
      const fetchedMissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMissions(fetchedMissions);
      console.log("Misiones cargadas/actualizadas:", fetchedMissions);
    }, (err) => {
      console.error("Error al escuchar misiones:", err);
      setError("Error al cargar las misiones disponibles. Verifica las reglas de seguridad.");
    });

    // Escuchar cambios en los clubes públicos en tiempo real
    // La ruta es artifacts/{appId}/public/data/clubs
    const clubsColRef = collection(db, `artifacts/${appId}/public/data/clubs`);
    const unsubscribeClubs = onSnapshot(clubsColRef, (snapshot) => {
      const fetchedClubs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClubs(fetchedClubs);
      console.log("Clubes cargados/actualizados:", fetchedClubs);
    }, (err) => {
      console.error("Error al escuchar clubes:", err);
      setError("Error al cargar los clubes. Verifica las reglas de seguridad.");
    });

    // Limpieza de listeners al desmontar el componente para evitar fugas de memoria
    return () => {
      unsubscribeUserData();
      unsubscribeMissions();
      unsubscribeClubs();
    };
  }, [db, userId, appId, error]); // Dependencias para re-ejecutar el efecto

  // --- Funciones de Lógica del Juego ---

  /**
   * Inicializa los datos básicos para un nuevo usuario en Firestore.
   * @param {string} uid - El ID único del usuario.
   * @param {object} database - La instancia de Firestore.
   */
  const initializeNewUser = async (uid, database) => {
    const userRef = doc(database, `artifacts/${appId}/users/${uid}/profile`, 'userData');
    const initialData = {
      xp: 0,
      level: 1,
      coins: 0, // Aquí se gestionan las Lupicoins
      badges: [], // Insignias obtenidas
      skills: { // Habilidades del árbol de talentos
        'Fuerza': 0,
        'Resistencia': 0,
        'Técnica': 0,
        'Liderazgo': 0,
        'Comunidad': 0,
        'Estrategia': 0,
      },
      skillPoints: 0, // Puntos para mejorar habilidades
      completedMissions: [], // IDs de misiones ya completadas
      currentClub: null, // ID del club al que pertenece
      lastLogin: new Date().toISOString(), // Fecha del último login
    };
    try {
      await setDoc(userRef, initialData); // Usa setDoc para crear o sobrescribir
      setUserData(initialData); // Actualizar el estado con los datos iniciales
      console.log('Datos iniciales del usuario creados para:', uid);
    } catch (err) {
      console.error('Error al inicializar datos del usuario:', err);
      setError('No se pudieron inicializar tus datos de usuario. Inténtalo de nuevo.');
    }
  };

  /**
   * Añade XP al usuario y gestiona la subida de nivel, otorgando Lupicoins y puntos de habilidad.
   * @param {number} amount - Cantidad de XP a añadir.
   */
  const addXP = async (amount) => {
    if (!userData || !db || !userId) {
      console.log("Datos no disponibles para añadir XP.");
      return;
    }

    let newXP = userData.xp + amount;
    let newLevel = userData.level;
    let skillPointsEarned = userData.skillPoints || 0;
    let coinsEarned = 0; // Podrías añadir recompensas de monedas por subir de nivel aquí

    // Lógica de subida de nivel (ejemplo simple)
    // Cada nivel requiere 1000 XP * el nivel actual.
    const xpToNextLevel = (level) => level * 1000;

    while (newXP >= xpToNextLevel(newLevel)) {
      newXP -= xpToNextLevel(newLevel); // Resta el XP necesario para el nivel actual
      newLevel += 1; // Sube de nivel
      skillPointsEarned += 1; // Otorga 1 punto de habilidad por cada nivel
      coinsEarned += 50; // Otorga 50 Lupicoins por cada nivel
      console.log(`¡Felicitaciones! Has subido al Nivel ${newLevel}`);
      // Aquí podrías agregar más lógica para desbloquear misiones o contenido
    }

    // Actualizar los datos del usuario en Firestore
    const userRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userData');
    try {
      await updateDoc(userRef, {
        xp: newXP,
        level: newLevel,
        skillPoints: skillPointsEarned,
        coins: userData.coins + coinsEarned, // Añade las monedas ganadas por subir de nivel
      });
      console.log(`XP añadido: ${amount}. Nuevo XP: ${newXP}, Nivel: ${newLevel}`);
    } catch (err) {
      console.error('Error al actualizar XP/Nivel:', err);
    }
  };

  /**
   * Completa una misión, otorgando XP, Lupicoins e insignias.
   * @param {string} missionId - ID de la misión a completar.
   * @param {number} xpReward - Recompensa de XP de la misión.
   * @param {number} coinsReward - Recompensa de Lupicoins de la misión.
   * @param {string} [badgeReward=null] - Nombre de la insignia a otorgar (opcional).
   */
  const completeMission = async (missionId, xpReward, coinsReward, badgeReward = null) => {
    if (!userData || !db || !userId) {
      console.log("Datos no disponibles para completar misión.");
      return;
    }

    // Verificar si la misión ya está completada para este usuario
    if (userData.completedMissions.includes(missionId)) {
      console.log(`Misión ${missionId} ya completada por este usuario.`);
      return;
    }

    await addXP(xpReward); // Añade XP y gestiona la subida de nivel

    const userRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userData');
    const updatedCompletedMissions = [...userData.completedMissions, missionId];
    let updatedCoins = userData.coins + coinsReward; // Suma las Lupicoins de la misión
    let updatedBadges = userData.badges || []; // Asegura que sea un array

    if (badgeReward && !updatedBadges.includes(badgeReward)) {
      updatedBadges = [...updatedBadges, badgeReward];
    }

    try {
      await updateDoc(userRef, {
        coins: updatedCoins,
        completedMissions: updatedCompletedMissions,
        badges: updatedBadges,
      });
      console.log(`Misión ${missionId} completada. Recompensas otorgadas: ${xpReward} XP, ${coinsReward} Lupicoins.`);
    } catch (err) {
      console.error('Error al completar misión:', err);
    }
  };

  /**
   * Permite al usuario mejorar una habilidad gastando puntos de habilidad.
   * @param {string} skillName - Nombre de la habilidad a mejorar.
   */
  const upgradeSkill = async (skillName) => {
    if (!userData || !db || !userId) {
      console.log("Datos no disponibles para mejorar habilidad.");
      return;
    }

    // Asegúrate de que el usuario tenga puntos de habilidad disponibles
    if ((userData.skillPoints || 0) <= 0) {
      console.log("No tienes puntos de habilidad para mejorar.");
      // Aquí podrías mostrar un mensaje al usuario en la UI
      return;
    }

    // Asegura que la habilidad existe y su nivel es un número
    const currentSkillLevel = typeof userData.skills[skillName] === 'number' ? userData.skills[skillName] : 0;
    const userRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userData');

    try {
      // Incrementa el nivel de la habilidad y decrementa los puntos de habilidad
      await updateDoc(userRef, {
        [`skills.${skillName}`]: currentSkillLevel + 1, // Sintaxis para actualizar campos anidados
        skillPoints: (userData.skillPoints || 0) - 1,
      });
      console.log(`Habilidad ${skillName} mejorada a nivel ${currentSkillLevel + 1}`);
      // Aquí podrías desbloquear nuevas misiones relacionadas con la habilidad mejorada
    } catch (err) {
      console.error(`Error al mejorar la habilidad ${skillName}:`, err);
      setError(`No se pudo mejorar la habilidad ${skillName}.`);
    }
  };


  // --- UI de la Aplicación (Componentes Visuales) ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-xl">Cargando Lupi App...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-900 text-white p-4">
        <div className="text-xl text-center">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-6 md:p-10 font-sans antialiased">
      {/* Carga de Tailwind CSS y fuente Inter */}
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      <style>
        {`
          body { font-family: 'Inter', sans-serif; }
          .card-glass {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
          }
          .btn-primary {
            background: linear-gradient(to right, #6366f1, #a855f7);
            transition: all 0.3s ease-in-out;
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
          }
          .btn-primary:hover {
            background: linear-gradient(to right, #4f46e5, #9333ea);
            transform: scale(1.05);
            box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6);
          }
          .btn-secondary {
            background: linear-gradient(to right, #06b6d4, #3b82f6);
            transition: all 0.3s ease-in-out;
            box-shadow: 0 4px 15px rgba(6, 182, 212, 0.4);
          }
          .btn-secondary:hover {
            background: linear-gradient(to right, #0891b2, #2563eb);
            transform: scale(1.05);
            box-shadow: 0 6px 20px rgba(6, 182, 212, 0.6);
          }
          .btn-disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        `}
      </style>

      <header className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 rounded-md p-2">
          ¡Bienvenido a Lupi App!
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mt-4">Tu progreso en "De la Cancha al Club"</p>
        <div className="text-sm text-gray-500 mt-2">ID de Usuario: <span className="font-mono text-blue-300">{userId}</span></div>
      </header>

      {userData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Tarjeta de Perfil del Jugador */}
          <div className="card-glass p-6 rounded-xl flex flex-col items-center shadow-lg transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-3xl font-bold text-blue-300 mb-4">Tu Perfil</h2>
            <div className="text-lg text-gray-200 mb-2">
              <span className="font-semibold">Nivel:</span> {userData.level} ({
                userData.level >= 20 ? 'Leyenda del Barrio' :
                userData.level >= 10 ? 'Crack' :
                userData.level >= 5 ? 'Promesa' : 'Novato'
              })
            </div>
            <div className="text-lg text-gray-200 mb-2">
              <span className="font-semibold">XP:</span> {userData.xp} / {userData.level * 1000}
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3 mt-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full"
                style={{ width: `${(userData.xp / (userData.level * 1000)) * 100}%` }}
              ></div>
            </div>
            <div className="text-lg text-gray-200 mt-4">
              <span className="font-semibold">Lupicoins:</span> {userData.coins} 💰
            </div>
            <button
              onClick={() => addXP(500)}
              className="mt-6 px-6 py-3 btn-primary text-white font-bold rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              Añadir 500 XP (Prueba)
            </button>
          </div>

          {/* Tarjeta de Habilidades */}
          <div className="card-glass p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-3xl font-bold text-purple-300 mb-4 text-center">Tus Habilidades</h2>
            <p className="text-lg text-gray-300 mb-4 text-center">Puntos de Habilidad: {userData.skillPoints || 0}</p>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(userData.skills).map(([skill, level]) => (
                <div key={skill} className="flex flex-col items-center">
                  <span className="text-md font-semibold text-gray-200">{skill}: {level}</span>
                  <button
                    onClick={() => upgradeSkill(skill)}
                    disabled={(userData.skillPoints || 0) <= 0}
                    className={`mt-2 px-4 py-2 text-white text-sm font-bold rounded-full shadow-md transition-all duration-300 ${
                      (userData.skillPoints || 0) <= 0 ? 'btn-disabled' : 'btn-secondary'
                    } focus:outline-none focus:ring-2 focus:ring-teal-400`}
                  >
                    Subir {skill}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tarjeta de Insignias y Club */}
          <div className="card-glass p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-3xl font-bold text-orange-300 mb-4 text-center">Insignias & Club</h2>
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-gray-200 mb-2">Tus Insignias:</h3>
              {userData.badges && userData.badges.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {userData.badges.map((badge, index) => (
                    <span key={index} className="bg-yellow-600 text-yellow-100 px-3 py-1 rounded-full text-sm font-medium shadow-md">
                      {badge}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">Aún no tienes insignias. ¡Completa misiones!</p>
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-200 mb-2">Club Actual:</h3>
              {userData.currentClub ? (
                <p className="text-gray-300">{userData.currentClub}</p>
              ) : (
                <p className="text-gray-400">No perteneces a ningún club. ¡Únete a uno!</p>
              )}
              <button
                // Lógica para unirse/crear club (a implementar)
                className="mt-4 px-6 py-3 btn-primary text-white font-bold rounded-full focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                Buscar/Crear Club
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sección de Misiones */}
      <section className="mb-12">
        <h2 className="text-4xl font-bold text-center text-green-400 mb-8">Misiones Disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {missions.length > 0 ? (
            missions.map((mission) => (
              <div key={mission.id} className="card-glass p-6 rounded-xl shadow-md flex flex-col justify-between transform hover:scale-105 transition-transform duration-300">
                <div>
                  <h3 className="text-2xl font-semibold text-gray-100 mb-2">{mission.name}</h3>
                  <p className="text-gray-300 mb-3">{mission.description}</p>
                  <p className="text-sm text-gray-400">Tipo: {mission.type}</p>
                  <p className="text-sm text-gray-400">Recompensa: {mission.xpReward} XP, {mission.coinsReward} Lupicoins {mission.badgeReward && `, Insignia: ${mission.badgeReward}`}</p>
                </div>
                <button
                  onClick={() => completeMission(mission.id, mission.xpReward, mission.coinsReward, mission.badgeReward)}
                  disabled={userData && userData.completedMissions.includes(mission.id)}
                  className={`mt-4 w-full px-5 py-2 text-white font-bold rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 ${
                    userData && userData.completedMissions.includes(mission.id) ? 'btn-disabled' : 'btn-primary'
                  } focus:outline-none focus:ring-2 focus:ring-blue-400`}
                >
                  {userData && userData.completedMissions.includes(mission.id) ? 'Misión Completada' : 'Completar Misión'}
                </button>
              </div>
            ))
          ) : (
            <p className="col-span-full text-center text-gray-400">No hay misiones disponibles en este momento. ¡Añádelas en Firebase!</p>
          )}
        </div>
      </section>

      {/* Sección de Clubes (Placeholder) */}
      <section className="mb-12">
        <h2 className="text-4xl font-bold text-center text-yellow-400 mb-8">Explora Clubes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clubs.length > 0 ? (
            clubs.map((club) => (
              <div key={club.id} className="card-glass p-6 rounded-xl shadow-md transform hover:scale-105 transition-transform duration-300">
                <h3 className="text-2xl font-semibold text-gray-100 mb-2">{club.name}</h3>
                <p className="text-gray-300 mb-3">Miembros: {club.membersCount || 0}</p>
                <p className="text-gray-400">Objetivo: {club.goal || 'Sin objetivo definido'}</p>
                <button
                  // Lógica para ver detalles del club o unirse (a implementar)
                  className="mt-4 w-full px-5 py-2 btn-secondary text-white font-bold rounded-full focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  Ver Club
                </button>
              </div>
            ))
          ) : (
            <p className="col-span-full text-center text-gray-400">No hay clubes disponibles en este momento. ¡Crea uno en Firebase!</p>
          )}
        </div>
      </section>

      {/* Sección de Desafíos Uno vs. Uno (Placeholder) */}
      <section className="text-center">
        <h2 className="text-4xl font-bold text-center text-pink-400 mb-8">Desafíos Uno vs. Uno</h2>
        <p className="text-gray-300 text-lg mb-6">¡Reta a otros jugadores a duelos de habilidades y demuestra quién es el mejor!</p>
        <button
          // Lógica para iniciar desafío Uno vs Uno (a implementar)
          className="px-8 py-4 btn-primary text-xl font-bold rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400"
        >
          Iniciar Desafío
        </button>
      </section>
    </div>
  );
};

export default App;
