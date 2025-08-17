import { useEffect, useState } from "react";
import type { Auth, User } from "firebase/auth";
import type { DocumentData, DocumentReference } from "firebase/firestore";
import { getDoc, doc } from "firebase/firestore";
import { db, auth } from "../firebase"; // tu archivo de config firebase

interface UserData {
  xp: number;
  level: number;
  coins: number;
  badges: string[];
  skills: {
    Fuerza: number;
    Resistencia: number;
    Técnica: number;
    Liderazgo: number;
    Comunidad: number;
    Estrategia: number;
  };
  skillPoints: number;
  completedMissions: string[];
  currentClub: string | null;
  lastLogin: string;
}

const DashboardScreen = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // --- Obtener usuario autenticado ---
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user: User | null) => {
      if (user) {
        setUserId(user.uid);
        await fetchUserData(user.uid);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Obtener datos de Firestore ---
  const fetchUserData = async (uid: string) => {
    try {
      const userRef: DocumentReference<DocumentData> = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setUserData(userSnap.data() as UserData);
      } else {
        console.log("No existe el usuario, inicializarlo");
        // Aquí podés crear el documento inicial si no existe
      }
    } catch (error) {
      console.error("Error al obtener datos del usuario:", error);
    }
  };

  if (loading) return <div className="text-white text-xl text-center mt-20">Cargando Dashboard...</div>;

  if (!userData) return <div className="text-white text-xl text-center mt-20">Usuario no encontrado.</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-6 md:p-10 font-sans antialiased">
      <header className="text-center mb-12">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
          Dashboard de Lupi
        </h1>
        <p className="text-xl text-gray-300 mt-2">Bienvenido al progreso de tu jugador</p>
        <div className="text-sm text-gray-500 mt-1">
          ID: <span className="font-mono text-blue-300">{userId}</span>
        </div>
      </header>

      {/* Perfil */}
      <div className="card-glass p-6 rounded-xl shadow-lg flex flex-col items-center mb-10 transform hover:scale-105 transition-transform duration-300">
        <h2 className="text-3xl font-bold text-blue-300 mb-4">Tu Perfil</h2>
        <p className="text-gray-200 mb-2">Nivel: {userData.level}</p>
        <p className="text-gray-200 mb-2">XP: {userData.xp}</p>
        <p className="text-gray-200 mb-2">Lupicoins: {userData.coins}</p>
      </div>

      {/* Habilidades */}
      <div className="card-glass p-6 rounded-xl shadow-lg mb-10">
        <h2 className="text-3xl font-bold text-purple-300 mb-4 text-center">Habilidades</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(userData.skills).map(([skill, level]) => (
            <div key={skill} className="flex flex-col items-center bg-gray-800 p-4 rounded-lg">
              <span className="text-gray-200 font-semibold">{skill}</span>
              <span className="text-green-400 font-bold">{level}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Insignias */}
      <div className="card-glass p-6 rounded-xl shadow-lg mb-10">
        <h2 className="text-3xl font-bold text-orange-300 mb-4 text-center">Insignias</h2>
        <div className="flex flex-wrap gap-2 justify-center">
          {userData.badges.length > 0 ? (
            userData.badges.map((badge, i) => (
              <span key={i} className="bg-yellow-600 text-yellow-100 px-3 py-1 rounded-full text-sm font-medium shadow-md">
                {badge}
              </span>
            ))
          ) : (
            <p className="text-gray-400">Aún no tienes insignias.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
