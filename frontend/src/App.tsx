import React, { useState, useEffect } from 'react';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, Auth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  Firestore,
  DocumentData, // Importar DocumentData
  QueryDocumentSnapshot, // Para tipar los docs de onSnapshot
} from 'firebase/firestore';

// =====================================================================
// === Definiciones de Tipos (Interfaces) para TypeScript ===
// =====================================================================

// Interfaz para los datos del usuario
interface UserData {
  xp: number;
  level: number;
  coins: number;
  badges: string[];
  skills: {
    'Fuerza': number;
    'Resistencia': number;
    'Técnica': number;
    'Liderazgo': number;
    'Comunidad': number;
    'Estrategia': number;
  };
  skillPoints: number;
  completedMissions: string[];
  currentClub: string | null;
  lastLogin: string;
}

// Interfaz para una misión
interface Mission {
  id: string; // ID del documento de la misión
  name: string;
  description: string;
  type: string; // Ej: "Diaria", "Logro", "Club"
  xpReward: number;
  coinsReward: number;
  badgeReward?: string; // Opcional
}

// Interfaz para un club
interface Club {
  id: string; // ID del documento del club
  name: string;
  membersCount: number;
  goal?: string; // Opcional
  totalXP: number; // XP acumulado del club
}

// =====================================================================
// === Código Principal de la Aplicación ===
// =====================================================================

const App = () => {
  // Accede a las variables de entorno definidas en Render
  // Para entornos locales con Vite, se usa import.meta.env
  // Asegúrate de que las variables de entorno están en formato JSON si es necesario
  const appId = import.meta.env.VITE_REACT_APP_APP_ID || 'default-lupi-app-id';
  const firebaseConfig = JSON.parse(import.meta.env.VITE_REACT_APP_FIREBASE_CONFIG || '{}');
  const initialAuthToken = import.meta.env.VITE_REACT_APP_INITIAL_AUTH_TOKEN || null;

  // Estados con tipado explícito
  const [firebaseApp, setFirebaseApp] = useState<FirebaseApp | null>(null);
  const [firestoreDb, setFirestoreDb] = useState<Firestore | null>(null);
  const [firebaseAuth, setFirebaseAuth] = useState<Auth | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // --- 1. Inicialización de Firebase y Autenticación ---
  useEffect(() => {
    const initFirebase = async () => {
      try {
        if (Object.keys(firebaseConfig).length === 0) {
          console.error("Firebase config is empty. Please check your environment variables.");
          setError("Error de configuración de Firebase. Contacta al soporte.");
          setLoading(false);
          return;
        }

        const appInstance = initializeApp(firebaseConfig);
        const dbInstance = getFirestore(appInstance);
        const authInstance = getAuth(appInstance);

        setFirebaseApp(appInstance);
        setFirestoreDb(dbInstance);
        setFirebaseAuth(authInstance);

        if (initialAuthToken) {
          await signInWithCustomToken(authInstance, initialAuthToken);
        } else {
          await signInAnonymously(authInstance);
        }

        onAuthStateChanged(authInstance, (user) => {
          if (user) {
            setUserId(user.uid);
            console.log('Usuario autenticado:', user.uid);
          } else {
            // Este caso es menos común después de signInAnonymously exitoso,
            // pero si ocurre (ej. si la sesión expira o no hay token),
            // generamos un UUID para simular un usuario único.
            setUserId(crypto.randomUUID());
            console.log('Usuario anónimo generado (fallback):', userId);
          }
          setLoading(false);
        });
      } catch (err: any) { // Usar 'any' para capturar errores genéricos
        console.error("Error al inicializar Firebase o autenticar:", err);
        setError(`Error al cargar la aplicación: ${err.message || "desconocido"}. Por favor, inténtelo de nuevo más tarde.`);
        setLoading(false);
      }
    };

    initFirebase();
  }, []);

  // --- 2. Carga de Datos del Usuario y Misiones ---
  useEffect(() => {
    if (!firestoreDb || !userId || error) return;

    const userDocRef = doc(firestoreDb, `artifacts/${appId}/users/${userId}/profile`, 'userData');
    const unsubscribeUserData = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserData; // Casteo a UserData
        setUserData(data);
        console.log("Datos del usuario cargados/actualizados:", data);
        if (typeof data.xp === 'undefined' || typeof data.level === 'undefined' || typeof data.coins === 'undefined') {
          initializeNewUser(userId, firestoreDb);
        }
      } else {
        initializeNewUser(userId, firestoreDb);
      }
    }, (err: any) => {
      console.error("Error al escuchar datos del usuario:", err);
      setError(`Error al cargar los datos de tu perfil: ${err.message || "desconocido"}. Verifica las reglas de seguridad.`);
    });

    const missionsColRef = collection(firestoreDb, `artifacts/${appId}/public/data/missions`);
    const unsubscribeMissions = onSnapshot(missionsColRef, (snapshot) => {
      const fetchedMissions = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({ id: doc.id, ...doc.data() } as Mission));
      setMissions(fetchedMissions);
      console.log("Misiones cargadas/actualizadas:", fetchedMissions);
    }, (err: any) => {
      console.error("Error al escuchar misiones:", err);
      setError(`Error al cargar las misiones disponibles: ${err.message || "desconocido"}. Verifica las reglas de seguridad.`);
    });

    const clubsColRef = collection(firestoreDb, `artifacts/${appId}/public/data/clubs`);
    const unsubscribeClubs = onSnapshot(clubsColRef, (snapshot) => {
      const fetchedClubs = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({ id: doc.id, ...doc.data() } as Club));
      setClubs(fetchedClubs);
      console.log("Clubes cargados/actualizados:", fetchedClubs);
    }, (err: any) => {
      console.error("Error al escuchar clubes:", err);
      setError(`Error al cargar los clubes: ${err.message || "desconocido"}. Verifica las reglas de seguridad.`);
    });

    return () => {
      unsubscribeUserData();
      unsubscribeMissions();
      unsubscribeClubs();
    };
  }, [firestoreDb, userId, appId, error]);

  // --- Funciones de Lógica del Juego ---

  const initializeNewUser = async (uid: string, database: Firestore) => {
    const userRef = doc(database, `artifacts/${appId}/users/${uid}/profile`, 'userData');
    const initialData: UserData = { // Tipado explícito aquí
      xp: 0,
      level: 1,
      coins: 0,
      badges: [],
      skills: {
        'Fuerza': 0,
        'Resistencia': 0,
        'Técnica': 0,
        'Liderazgo': 0,
        'Comunidad': 0,
        'Estrategia': 0,
      },
      skillPoints: 0,
      completedMissions: [],
      currentClub: null,
      lastLogin: new Date().toISOString(),
    };
    try {
      await setDoc(userRef, initialData);
      setUserData(initialData);
      console.log('Datos iniciales del usuario creados para:', uid);
    } catch (err: any) {
      console.error('Error al inicializar datos del usuario:', err);
      setError(`No se pudieron inicializar tus datos de usuario: ${err.message || "desconocido"}.`);
    }
  };

  const addXP = async (amount: number) => { // Tipado del parámetro
    if (!userData || !firestoreDb || !userId) {
      console.log("Datos no disponibles para añadir XP.");
      return;
    }

    let newXP = userData.xp + amount;
    let newLevel = userData.level;
    let skillPointsEarned = userData.skillPoints;
    let coinsEarned = 0;

    const xpToNextLevel = (level: number) => level * 1000; // Tipado del parámetro

    while (newXP >= xpToNextLevel(newLevel)) {
      newXP -= xpToNextLevel(newLevel);
      newLevel += 1;
      skillPointsEarned += 1;
      coinsEarned += 50;
      console.log(`¡Felicitaciones! Has subido al Nivel ${newLevel}`);
    }

    const userRef = doc(firestoreDb, `artifacts/${appId}/users/${userId}/profile`, 'userData');
    try {
      await updateDoc(userRef, {
        xp: newXP,
        level: newLevel,
        skillPoints: skillPointsEarned,
        coins: userData.coins + coinsEarned,
      });
      console.log(`XP añadido: ${amount}. Nuevo XP: ${newXP}, Nivel: ${newLevel}`);
    } catch (err: any) {
      console.error('Error al actualizar XP/Nivel:', err);
    }
  };

  const completeMission = async (missionId: string, xpReward: number, coinsReward: number, badgeReward: string | null = null) => { // Tipado de parámetros
    if (!userData || !firestoreDb || !userId) {
      console.log("Datos no disponibles para completar misión.");
      return;
    }

    if (userData.completedMissions.includes(missionId)) {
      console.log(`Misión ${missionId} ya completada por este usuario.`);
      return;
    }

    await addXP(xpReward);

    const userRef = doc(firestoreDb, `artifacts/${appId}/users/${userId}/profile`, 'userData');
    const updatedCompletedMissions = [...userData.completedMissions, missionId];
    let updatedCoins = userData.coins + coinsReward;
    let updatedBadges = userData.badges || [];

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
    } catch (err: any) {
      console.error('Error al completar misión:', err);
    }
  };

  const upgradeSkill = async (skillName: keyof UserData['skills']) => { // Tipado más específico
    if (!userData || !firestoreDb || !userId) {
      console.log("Datos no disponibles para mejorar habilidad.");
      return;
    }

    if (userData.skillPoints <= 0) {
      console.log("No tienes puntos de habilidad para mejorar.");
      return;
    }

    const currentSkillLevel = userData.skills[skillName];
    const userRef = doc(firestoreDb, `artifacts/${appId}/users/${userId}/profile`, 'userData');

    try {
      await updateDoc(userRef, {
        [`skills.${skillName}`]: currentSkillLevel + 1,
        skillPoints: userData.skillPoints - 1,
      });
      console.log(`Habilidad ${skillName} mejorada a nivel ${currentSkillLevel + 1}`);
    } catch (err: any) {
      console.error(`Error al mejorar la habilidad ${skillName}:`, err);
      setError(`No se pudo mejorar la habilidad ${skillName}. ${err.message || "desconocido"}`);
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

      {/* Asegúrate de que userData no sea null antes de intentar acceder a sus propiedades */}
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
            <p className="text-lg text-gray-300 mb-4 text-center">Puntos de Habilidad: {userData.skillPoints}</p>
            <div className="grid grid-cols-2 gap-4">
              {/* Object.entries es seguro aquí ya que skills tiene claves fijas */}
              {Object.entries(userData.skills).map(([skill, level]) => (
                <div key={skill} className="flex flex-col items-center">
                  <span className="text-md font-semibold text-gray-200">{skill}: {level}</span>
                  <button
                    onClick={() => upgradeSkill(skill as keyof UserData['skills'])} // Casteo para TypeScript
                    disabled={userData.skillPoints <= 0}
                    className={`mt-2 px-4 py-2 text-white text-sm font-bold rounded-full shadow-md transition-all duration-300 ${
                      userData.skillPoints <= 0 ? 'btn-disabled' : 'btn-secondary'
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
              {userData.badges.length > 0 ? (
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
                  onClick={() => completeMission(mission.id, mission.xpReward, mission.coinsReward, mission.badgeReward || null)}
                  disabled={userData?.completedMissions.includes(mission.id) || false} // Uso de optional chaining y fallback para disabled
                  className={`mt-4 w-full px-5 py-2 text-white font-bold rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 ${
                    userData?.completedMissions.includes(mission.id) ? 'btn-disabled' : 'btn-primary'
                  } focus:outline-none focus:ring-2 focus:ring-blue-400`}
                >
                  {userData?.completedMissions.includes(mission.id) ? 'Misión Completada' : 'Completar Misión'}
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
                <p className="text-gray-300 mb-3">Miembros: {club.membersCount}</p>
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