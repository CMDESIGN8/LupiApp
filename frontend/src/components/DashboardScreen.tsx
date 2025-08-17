import React, { useState, useEffect } from 'react';
import { Firestore, doc, setDoc, updateDoc, onSnapshot, collection, arrayUnion } from 'firebase/firestore';
import { Auth, signOut, User } from 'firebase/auth'; // Importa User

// =====================================================================
// === Definiciones de Tipos (Interfaces) ===
// =====================================================================

// Interfaz para las estadísticas de la carta FIFA
interface CardStats {
  overallRating: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physicality: number;
}

// Estructura actualizada de UserData, incluyendo la carta FIFA y la billetera
interface UserData {
  xp: number;
  level: number;
  coins: number; // Lupicoins del sistema de misiones
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
  playerName: string; // Nombre del personaje
  playerImage: string; // URL de la imagen del personaje
  cardStats: CardStats; // Estadísticas de la carta FIFA
  wallet: { // Objeto para la billetera del usuario
    name: string;
    balance: number; // Balance actual de la billetera
  };
}

// Interfaz para las misiones
interface Mission {
  id: string;
  name: string;
  description: string;
  type: string;
  xpReward: number;
  coinsReward: number;
  badgeReward?: string;
}

// Interfaz para los clubes
interface Club {
  id: string;
  name: string;
  membersCount: number;
  goal?: string;
  totalXP: number;
}

// Propiedades esperadas por el componente DashboardScreen
interface DashboardScreenProps {
  appId: string;
  firestoreDb: Firestore;
  firebaseAuth: Auth;
  currentUser: User; // El objeto de usuario de Firebase Authentication
}

// =====================================================================
// === Código Principal del Dashboard ===
// =====================================================================

const DashboardScreen: React.FC<DashboardScreenProps> = ({ appId, firestoreDb, firebaseAuth, currentUser }) => {
  const [userData, setUserData] = useState<UserData | null>(null); // Datos del perfil del usuario logueado
  const [missions, setMissions] = useState<Mission[]>([]); // Lista de misiones disponibles
  const [clubs, setClubs] = useState<Club[]>([]); // Lista de clubes disponibles
  const [loadingData, setLoadingData] = useState<boolean>(true); // Estado de carga para los datos del dashboard
  const [error, setError] = useState<string | null>(null); // Mensajes de error específicos del dashboard

  // El ID del usuario se toma directamente del objeto `currentUser` de Firebase Auth
  const userId = currentUser.uid;

  /**
   * Inicializa el perfil del usuario en Firestore si no existe o si le faltan campos esenciales.
   * Esto asegura que todos los usuarios (nuevos o existentes que inician sesión por primera vez con un nuevo método)
   * tengan una "carta FIFA" y una "billetera" asociadas.
   * @param {string} uid - El ID único del usuario.
   * @param {string | null} userEmail - El correo electrónico del usuario.
   * @param {string | null} userName - El nombre de visualización del usuario.
   */
  const initializeUserProfileIfMissing = async (uid: string, userEmail: string | null, userName: string | null) => {
    const userRef = doc(firestoreDb, `artifacts/${appId}/users/${uid}/profile`, 'userData');
    try {
      const docSnap = await doc(firestoreDb, `artifacts/${appId}/users/${uid}/profile`, 'userData').get(); // Obtener el documento

      // Si el documento no existe o le faltan campos clave como 'playerName', lo inicializamos
      if (!docSnap.exists() || !docSnap.data()?.playerName) {
        const baseName = userName?.toLowerCase().replace(/\s+/g, '') || (userEmail?.split('@')[0]?.toLowerCase().replace(/\s+/g, '') || 'usuario');
        const walletName = `${baseName}.lupi`;
        const initialData: UserData = {
          xp: 0,
          level: 1,
          coins: 0,
          badges: [],
          skills: {
            'Fuerza': 0, 'Resistencia': 0, 'Técnica': 0,
            'Liderazgo': 0, 'Comunidad': 0, 'Estrategia': 0,
          },
          skillPoints: 0,
          completedMissions: [],
          currentClub: null,
          lastLogin: new Date().toISOString(),
          playerName: userName || (userEmail?.split('@')[0] || 'Jugador Lupi'),
          playerImage: "https://placehold.co/150x150/007bff/FFFFFF?text=Lupi",
          cardStats: {
            overallRating: 65, pace: 70, shooting: 55,
            passing: 60, dribbling: 65, defending: 50, physicality: 60,
          },
          wallet: { name: walletName, balance: 0 }
        };
        await setDoc(userRef, initialData, { merge: true }); // Usar merge para no sobrescribir si ya existe
        console.log('Perfil de usuario inicializado/actualizado (desde Dashboard):', uid);
      }
    } catch (err: any) {
      console.error('Error al inicializar perfil de usuario (desde Dashboard):', err);
      setError(`No se pudo inicializar tu perfil: ${err.message || "desconocido"}.`);
    }
  };


  // --- Carga de Datos del Usuario y Misiones/Clubes ---
  useEffect(() => {
    // Si Firestore o el ID de usuario no están disponibles, no se pueden cargar los datos.
    if (!firestoreDb || !userId) {
      setLoadingData(false);
      return;
    }

    // Asegura que el perfil del usuario exista o lo crea justo antes de intentar leerlo.
    // Esto es crucial para manejar casos donde el usuario ya está autenticado (ej. anónimamente)
    // pero aún no tiene un perfil completo de "carta FIFA".
    initializeUserProfileIfMissing(userId, currentUser.email, currentUser.displayName);

    // Listener en tiempo real para el documento de datos del usuario.
    // La ruta es artifacts/{appId}/users/{userId}/profile/userData.
    const userDocRef = doc(firestoreDb, `artifacts/${appId}/users/${userId}/profile`, 'userData');
    const unsubscribeUserData = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserData; // Casteo de los datos a la interfaz UserData
        setUserData(data); // Actualiza el estado con los datos del usuario
        console.log("Datos del usuario cargados/actualizados:", data);
        // Si al cargar, el XP o el nivel no están definidos, es una señal de que el perfil está incompleto
        // y se debería volver a inicializar (aunque initializeUserProfileIfMissing ya lo maneja al inicio).
        if (typeof data.xp === 'undefined' || typeof data.level === 'undefined' || typeof data.coins === 'undefined') {
          console.warn("Datos de perfil incompletos. Re-inicializando...");
          initializeUserProfileIfMissing(userId, currentUser.email, currentUser.displayName);
        }
      } else {
        // Si el documento del usuario no existe, indica que necesita ser creado.
        // Esto es un caso de borde porque initializeUserProfileIfMissing ya debería haberlo manejado.
        console.warn("Documento userData no encontrado para", userId, ". Se creará o ya está en proceso.");
      }
      setLoadingData(false); // La carga de datos del usuario ha finalizado.
    }, (err: any) => {
      // Manejo de errores durante la suscripción a los datos del usuario.
      console.error("Error al escuchar datos del usuario:", err);
      setError(`Error al cargar los datos de tu perfil: ${err.message || "desconocido"}. Verifica las reglas de seguridad.`);
      setLoadingData(false);
    });

    // Listener en tiempo real para la colección de misiones públicas.
    // La ruta es artifacts/{appId}/public/data/missions.
    const missionsColRef = collection(firestoreDb, `artifacts/${appId}/public/data/missions`);
    const unsubscribeMissions = onSnapshot(missionsColRef, (snapshot) => {
      const fetchedMissions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Mission));
      setMissions(fetchedMissions); // Actualiza el estado con las misiones
      console.log("Misiones cargadas/actualizadas:", fetchedMissions);
    }, (err: any) => {
      // Manejo de errores durante la suscripción a las misiones.
      console.error("Error al escuchar misiones:", err);
      setError(`Error al cargar las misiones disponibles: ${err.message || "desconocido"}. Verifica las reglas de seguridad.`);
    });

    // Listener en tiempo real para la colección de clubes públicos.
    // La ruta es artifacts/{appId}/public/data/clubs.
    const clubsColRef = collection(firestoreDb, `artifacts/${appId}/public/data/clubs`);
    const unsubscribeClubs = onSnapshot(clubsColRef, (snapshot) => {
      const fetchedClubs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Club));
      setClubs(fetchedClubs); // Actualiza el estado con los clubes
      console.log("Clubes cargados/actualizados:", fetchedClubs);
    }, (err: any) => {
      // Manejo de errores durante la suscripción a los clubes.
      console.error("Error al escuchar clubes:", err);
      setError(`Error al cargar los clubes: ${err.message || "desconocido"}. Verifica las reglas de seguridad.`);
    });

    // Función de limpieza que se ejecuta al desmontar el componente para detener las suscripciones.
    return () => {
      unsubscribeUserData();
      unsubscribeMissions();
      unsubscribeClubs();
    };
  }, [firestoreDb, userId, appId, currentUser]); // Dependencias: re-ejecuta el efecto si cambian estas variables

  /**
   * Añade XP al usuario, gestiona la subida de nivel y otorga Lupicoins y puntos de habilidad.
   * @param {number} amount - Cantidad de XP a añadir.
   */
  const addXP = async (amount: number) => {
    if (!userData || !firestoreDb || !userId) {
      console.log("Datos no disponibles para añadir XP.");
      return;
    }

    let newXP = userData.xp + amount;
    let newLevel = userData.level;
    let skillPointsEarned = userData.skillPoints;
    let coinsEarned = 0; // Monedas ganadas por subir de nivel

    // Lógica de subida de nivel: cada nivel requiere 1000 XP * el nivel actual
    const xpToNextLevel = (level: number) => level * 1000;

    while (newXP >= xpToNextLevel(newLevel)) {
      newXP -= xpToNextLevel(newLevel); // Resta el XP necesario para el nivel actual
      newLevel += 1; // Sube de nivel
      skillPointsEarned += 1; // Otorga 1 punto de habilidad por cada nivel
      coinsEarned += 50; // Otorga 50 Lupicoins por cada nivel
      console.log(`¡Felicitaciones! Has subido al Nivel ${newLevel}!`);
      // Aquí se podría agregar lógica adicional para desbloquear contenido o modificar stats de la carta
    }

    // Actualizar los datos del usuario en Firestore de forma atómica
    const userRef = doc(firestoreDb, `artifacts/${appId}/users/${userId}/profile`, 'userData');
    try {
      await updateDoc(userRef, {
        xp: newXP,
        level: newLevel,
        skillPoints: skillPointsEarned,
        coins: userData.coins + coinsEarned, // Añade las Lupicoins ganadas por subir de nivel
        // Lógica para actualizar el overallRating y stats de la carta al subir de nivel:
        // Por ejemplo, aumentar el overallRating en 1 por cada nivel subido
        'cardStats.overallRating': userData.cardStats.overallRating + (newLevel - userData.level),
        // Puedes añadir aquí lógica para subir otros stats individuales también
      });
      console.log(`XP añadido: ${amount}. Nuevo XP: ${newXP}, Nivel: ${newLevel}`);
    } catch (err: any) {
      console.error('Error al actualizar XP/Nivel:', err);
    }
  };

  /**
   * Completa una misión, otorgando XP, Lupicoins e insignias.
   * Utiliza `arrayUnion` para añadir de forma atómica el ID de la misión y las insignias.
   * @param {string} missionId - ID de la misión a completar.
   * @param {number} xpReward - Recompensa de XP de la misión.
   * @param {number} coinsReward - Recompensa de Lupicoins de la misión.
   * @param {string | null} [badgeReward=null] - Nombre de la insignia a otorgar (opcional).
   */
  const completeMission = async (missionId: string, xpReward: number, coinsReward: number, badgeReward: string | null = null) => {
    if (!userData || !firestoreDb || !userId) {
      console.log("Datos no disponibles para completar misión.");
      return;
    }

    // Verifica si la misión ya fue completada por el usuario
    if (userData.completedMissions && userData.completedMissions.includes(missionId)) {
      console.log(`Misión ${missionId} ya completada por este usuario. No se otorgan recompensas.`);
      return;
    }

    await addXP(xpReward); // Añade XP y gestiona la subida de nivel

    const userRef = doc(firestoreDb, `artifacts/${appId}/users/${userId}/profile`, 'userData');

    // Prepara las actualizaciones para Firestore
    const updates: { coins: number; completedMissions: any; badges?: any; 'wallet.balance'?: number } = {
      coins: userData.coins + coinsReward, // Suma las Lupicoins de la misión al contador de misiones
      completedMissions: arrayUnion(missionId), // Añade el ID de la misión al array de completadas
    };

    // Actualiza el balance de la billetera. Asegúrate de que userData.wallet exista y tenga balance.
    if (userData.wallet && typeof userData.wallet.balance === 'number') {
      updates['wallet.balance'] = userData.wallet.balance + coinsReward;
    } else {
      // Si wallet o balance no existen, inicialízalos. Esto no debería ocurrir si initializeUserProfileIfMissing funciona bien.
      updates['wallet.balance'] = coinsReward;
    }

    // Si la misión tiene una insignia de recompensa y el usuario no la tiene, la añade
    if (badgeReward && !userData.badges.includes(badgeReward)) {
      updates.badges = arrayUnion(badgeReward);
    }

    try {
      await updateDoc(userRef, updates);
      console.log(`Misión "${missionId}" completada. Recompensas otorgadas.`);
    } catch (err: any) {
      console.error('Error al completar misión:', err);
      setError(`No se pudo completar la misión: ${err.message || "desconocido"}.`);
    }
  };

  /**
   * Permite al usuario mejorar una habilidad gastando puntos de habilidad.
   * @param {keyof UserData['skills']} skillName - Nombre de la habilidad a mejorar.
   */
  const upgradeSkill = async (skillName: keyof UserData['skills']) => {
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
        [`skills.${skillName}`]: currentSkillLevel + 1, // Actualiza el nivel de la habilidad específica
        skillPoints: userData.skillPoints - 1, // Reduce los puntos de habilidad disponibles
      });
      console.log(`Habilidad ${skillName} mejorada a nivel ${currentSkillLevel + 1}`);
    } catch (err: any) {
      console.error(`Error al mejorar la habilidad ${skillName}:`, err);
      setError(`No se pudo mejorar la habilidad ${skillName}. ${err.message || "desconocido"}`);
    }
  };

  /**
   * Cierra la sesión del usuario actual de Firebase Authentication.
   */
  const handleSignOut = async () => {
    try {
      await signOut(firebaseAuth);
      console.log("Sesión cerrada con éxito.");
    } catch (err: any) {
      console.error("Error al cerrar sesión:", err);
      setError(`No se pudo cerrar sesión: ${err.message || "desconocido"}.`);
    }
  };


  // Muestra un estado de carga mientras se obtienen los datos del dashboard.
  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-xl animate-pulse">Cargando datos del jugador...</div>
      </div>
    );
  }

  // Muestra un mensaje de error si ocurre un problema al cargar los datos.
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-900 text-white p-4">
        <div className="text-xl text-center">Error: {error}</div>
      </div>
    );
  }

  // Si userData es null aquí (después de la carga), indica un problema con la inicialización del perfil.
  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-xl text-center">Preparando tu perfil... Si esto tarda, recarga la página.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-6 md:p-10 font-sans antialiased">
      {/* El CSS de Tailwind y la fuente Inter se cargan en App.tsx, no es necesario aquí */}
      <header className="text-center mb-16 pt-8">
        <h1 className="text-6xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 rounded-lg p-3 inline-block header-glow">
          ¡Bienvenido a Lupi App!
        </h1>
        <p className="text-2xl md:text-3xl text-gray-200 mt-4 font-light">Tu progreso en "De la Cancha al Club"</p>
        <div className="text-base text-gray-500 mt-4 user-id-anim">
          ID de Usuario: <span className="font-mono text-blue-300 font-bold tracking-wider">{userId}</span>
          <br/>
          {currentUser.email && <span className="text-sm text-gray-400">Email: {currentUser.email}</span>}
        </div>
        <button
          onClick={handleSignOut}
          className="mt-6 px-6 py-3 btn-secondary text-white text-lg rounded-full shadow-xl"
        >
          Cerrar Sesión
        </button>
      </header>

      {/* Asegúrate de que userData no sea null antes de intentar acceder a sus propiedades */}
      {userData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16 max-w-7xl mx-auto">
          {/* Tarjeta de Perfil del Jugador / FIFA Card */}
          <div className="card-glass p-8 rounded-2xl flex flex-col items-center text-center">
            <h2 className="text-3xl font-bold text-blue-300 mb-5 section-title">Tu Carta FIFA</h2>
            <img
              src={userData.playerImage}
              alt={userData.playerName || "Imagen del Jugador"}
              className="w-32 h-32 rounded-full object-cover border-4 border-purple-500 shadow-lg mb-4"
              onError={(e) => { e.currentTarget.src = "https://placehold.co/150x150/007bff/FFFFFF?text=Lupi"; }} // Fallback en caso de error
            />
            <h3 className="text-3xl font-extrabold text-white mb-2">{userData.playerName}</h3>
            <div className="text-lg text-gray-200 mb-3">
              <span className="font-semibold">Nivel:</span> <span className="text-purple-400">{userData.level}</span> ({
                userData.level >= 20 ? 'Leyenda del Barrio' :
                userData.level >= 10 ? 'Crack' :
                userData.level >= 5 ? 'Promesa' : 'Novato'
              })
            </div>
            <div className="text-xl text-gray-200 mb-3">
              <span className="font-semibold">Overall:</span> <span className="text-yellow-400 font-bold text-4xl">{userData.cardStats.overallRating}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-md text-gray-300 w-full mt-4">
              <div className="flex justify-between items-center"><span className="font-semibold">RIT:</span> <span className="text-green-300">{userData.cardStats.pace}</span></div>
              <div className="flex justify-between items-center"><span className="font-semibold">TIRO:</span> <span className="text-red-300">{userData.cardStats.shooting}</span></div>
              <div className="flex justify-between items-center"><span className="font-semibold">PASE:</span> <span className="text-blue-300">{userData.cardStats.passing}</span></div>
              <div className="flex justify-between items-center"><span className="font-semibold">REG:</span> <span className="text-yellow-300">{userData.cardStats.dribbling}</span></div>
              <div className="flex justify-between items-center"><span className="font-semibold">DEF:</span> <span className="text-cyan-300">{userData.cardStats.defending}</span></div>
              <div className="flex justify-between items-center"><span className="font-semibold">FIS:</span> <span className="text-orange-300">{userData.cardStats.physicality}</span></div>
            </div>
            <div className="text-xl text-gray-200 mt-6 font-bold flex flex-col items-center gap-2">
              <span className="font-semibold">XP:</span> {userData.xp} / {userData.level * 1000}
              <div className="w-full bg-gray-700 rounded-full h-4 mt-1 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(userData.xp / (userData.level * 1000)) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="text-2xl text-gray-200 mt-6 font-bold flex items-center gap-2">
              <span className="font-semibold">Billetera {userData.wallet.name}:</span> {userData.wallet.balance} <span role="img" aria-label="coin">💰</span>
            </div>
            <div className="text-lg text-gray-200 mt-2 font-bold flex items-center gap-2">
              <span className="font-semibold">Lupicoins (Sistema Misiones):</span> {userData.coins}
            </div>
            <button
              onClick={() => addXP(500)} // Mantén esta función para testear XP
              className="mt-8 px-8 py-4 btn-primary text-white text-lg rounded-full shadow-xl"
            >
              Añadir 500 XP (Prueba)
            </button>
          </div>

          {/* Tarjeta de Habilidades (se mantiene igual, ya mapea de userData.skills) */}
          <div className="card-glass p-8 rounded-2xl text-center">
            <h2 className="text-3xl font-bold text-purple-300 mb-5 section-title">Tus Habilidades</h2>
            <p className="text-xl text-gray-300 mb-6">Puntos de Habilidad: <span className="font-bold text-green-400">{userData.skillPoints}</span></p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {Object.entries(userData.skills).map(([skill, level]) => (
                <div key={skill} className="flex flex-col items-center bg-gray-800/40 p-3 rounded-xl shadow-inner border border-gray-700/50">
                  <span className="text-lg font-semibold text-gray-200">{skill}: <span className="text-blue-300">{level}</span></span>
                  <button
                    onClick={() => upgradeSkill(skill as keyof UserData['skills'])}
                    disabled={userData.skillPoints <= 0}
                    className={`mt-3 px-5 py-2 text-white text-base font-bold rounded-full shadow-md ${
                      userData.skillPoints <= 0 ? 'btn-disabled' : 'btn-secondary'
                    }`}
                  >
                    Subir {skill}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tarjeta de Insignias y Club (se mantiene igual) */}
          <div className="card-glass p-8 rounded-2xl text-center">
            <h2 className="text-3xl font-bold text-orange-300 mb-5 section-title">Insignias & Club</h2>
            <div className="mb-6">
              <h3 className="text-2xl font-semibold text-gray-200 mb-3">Tus Insignias:</h3>
              {userData.badges.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-3">
                  {userData.badges.map((badge, index) => (
                    <span key={index} className="badge-style px-4 py-2 rounded-full text-base">
                      {badge}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-lg">Aún no tienes insignias. ¡Completa misiones!</p>
              )}
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-gray-200 mb-3">Club Actual:</h3>
              {userData.currentClub ? (
                <p className="text-gray-300 text-lg font-bold">{userData.currentClub}</p>
              ) : (
                <p className="text-gray-400 text-lg">No perteneces a ningún club. ¡Únete a uno!</p>
              )}
              <button
                // Lógica para unirse/crear club (a implementar)
                className="mt-6 px-8 py-4 btn-primary text-white text-lg rounded-full shadow-xl"
              >
                Buscar/Crear Club
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sección de Misiones (se mantiene igual, excepto la actualización de wallet.balance) */}
      <section className="mb-16 max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center text-green-400 mb-10 section-title">Misiones Disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {missions.length > 0 ? (
            missions.map((mission) => (
              <div key={mission.id} className="card-glass p-8 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-2xl font-semibold text-gray-100 mb-3">{mission.name}</h3>
                  <p className="text-gray-300 mb-4 text-base leading-relaxed">{mission.description}</p>
                  <p className="text-sm text-gray-400 mb-2">Tipo: <span className="font-semibold text-blue-300">{mission.type}</span></p>
                  <p className="text-sm text-gray-400">Recompensa: <span className="font-semibold text-yellow-300">{mission.xpReward} XP</span>, <span className="font-semibold text-green-300">{mission.coinsReward} Lupicoins</span> {mission.badgeReward && `, Insignia: ${mission.badgeReward}`}</p>
                </div>
                <button
                  onClick={() => completeMission(mission.id, mission.xpReward, mission.coinsReward, mission.badgeReward || null)}
                  disabled={userData?.completedMissions.includes(mission.id) || false}
                  className={`mt-6 w-full px-6 py-3 text-white text-lg font-bold rounded-full shadow-xl transition-all duration-300 ${
                    userData?.completedMissions.includes(mission.id) ? 'btn-disabled' : 'btn-primary'
                  }`}
                >
                  {userData?.completedMissions.includes(mission.id) ? 'Misión Completada ✔' : 'Completar Misión'}
                </button>
              </div>
            ))
          ) : (
            <p className="col-span-full text-center text-gray-400 text-xl">No hay misiones disponibles en este momento. ¡Añádelas en Firebase!</p>
          )}
        </div>
      </section>

      {/* Sección de Clubes */}
      <section className="mb-16 max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center text-yellow-400 mb-10 section-title">Explora Clubes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {clubs.length > 0 ? (
            clubs.map((club) => (
              <div key={club.id} className="card-glass p-8 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-2xl font-semibold text-gray-100 mb-3">{club.name}</h3>
                  <p className="text-gray-300 mb-2">Miembros: <span className="font-semibold text-blue-300">{club.membersCount}</span></p>
                  <p className="text-gray-400 text-base leading-relaxed">Objetivo: <span className="font-light text-gray-300">{club.goal || 'Sin objetivo definido'}</span></p>
                  <p className="text-sm text-gray-400 mt-2">XP del Club: <span className="font-semibold text-green-300">{club.totalXP || 0}</span></p>
                </div>
                <button
                  // Lógica para ver detalles del club o unirse (a implementar)
                  className="mt-6 w-full px-6 py-3 btn-secondary text-white text-lg font-bold rounded-full shadow-xl"
                >
                  Ver Club
                </button>
              </div>
            ))
          ) : (
            <p className="col-span-full text-center text-gray-400 text-xl">No hay clubes disponibles en este momento. ¡Crea uno en Firebase!</p>
          )}
        </div>
      </section>

      {/* Sección de Desafíos Uno vs. Uno */}
      <section className="text-center max-w-7xl mx-auto pb-10">
        <h2 className="text-4xl font-bold text-center text-pink-400 mb-10 section-title">Desafíos Uno vs. Uno</h2>
        <p className="text-gray-300 text-xl mb-8 leading-relaxed">¡Reta a otros jugadores a duelos de habilidades y demuestra quién es el mejor!</p>
        <button
          // Lógica para iniciar desafío Uno vs Uno (a implementar)
          className="px-10 py-5 btn-primary text-xl font-bold rounded-full shadow-2xl"
        >
          Iniciar Desafío
        </button>
      </section>
    </div>
  );
};

export default DashboardScreen;
