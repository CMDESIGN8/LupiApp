import React, { useState } from 'react';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, UserCredential } from 'firebase/auth';
import { Firestore, doc, setDoc } from 'firebase/firestore'; // Importa setDoc de Firestore

// =====================================================================
// === Definiciones de Tipos (Interfaces) ===
// =====================================================================

interface AuthScreenProps {
  appId: string; // Recibe appId para usarlo en la ruta de Firestore
  firestoreDb: Firestore; // Recibe la instancia de Firestore para crear/actualizar perfiles
  firebaseAuth: Auth; // Recibe la instancia de Auth para autenticación
}

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

// Estructura inicial del perfil del usuario (incluye Carta FIFA y Billetera)
interface InitialUserData {
  xp: number;
  level: number;
  coins: number; // Moneda del sistema de misiones (podría ser diferente a 'balance' de la billetera)
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
  playerName: string; // Nombre del personaje, elegido por el usuario
  playerImage: string; // URL de la imagen del personaje/carta
  cardStats: CardStats; // Estadísticas base de la carta FIFA
  wallet: { // Objeto para la billetera del usuario
    name: string; // Nombre de la billetera (ej: "nombredeusuario.lupi")
    balance: number; // Balance actual de la billetera
  };
}

// =====================================================================
// === Componente AuthScreen ===
// =====================================================================

const AuthScreen: React.FC<AuthScreenProps> = ({ appId, firestoreDb, firebaseAuth }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [playerNameInput, setPlayerNameInput] = useState(''); // Estado para el input del nombre del jugador
  const [isRegistering, setIsRegistering] = useState(false); // Alterna entre el formulario de login y registro
  const [loading, setLoading] = useState(false); // Estado de carga para los botones
  const [error, setError] = useState<string | null>(null); // Mensajes de error para el usuario

  /**
   * Inicializa o actualiza el perfil del usuario en Firestore después de un registro o login exitoso.
   * Se encarga de crear la "carta FIFA" y la "billetera".
   * @param {string} uid - El ID único del usuario de Firebase Authentication.
   * @param {string | null} userEmail - El correo electrónico del usuario.
   * @param {string | null} userName - El nombre de usuario/display name.
   */
  const initializeUserProfile = async (uid: string, userEmail: string | null, userName: string | null) => {
    const userRef = doc(firestoreDb, `artifacts/${appId}/users/${uid}/profile`, 'userData');

    // Genera el nombre de la billetera a partir del nombre del jugador o el email
    const baseName = userName?.toLowerCase().replace(/\s+/g, '') || (userEmail?.split('@')[0]?.toLowerCase().replace(/\s+/g, '') || 'usuario');
    const walletName = `${baseName}.lupi`;

    const initialData: InitialUserData = {
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
      playerName: userName || (userEmail?.split('@')[0] || 'Jugador Lupi'), // Usa el nombre de input, o del email, o un fallback
      playerImage: "https://placehold.co/150x150/007bff/FFFFFF?text=Lupi", // Placeholder inicial
      cardStats: { // Estadísticas iniciales de la carta FIFA
        overallRating: 65,
        pace: 70,
        shooting: 55,
        passing: 60,
        dribbling: 65,
        defending: 50,
        physicality: 60,
      },
      wallet: {
        name: walletName,
        balance: 0,
      }
    };

    try {
      // Usamos setDoc con { merge: true } para crear el documento si no existe,
      // o para actualizarlo sin sobrescribir completamente si ya existe (útil para logins).
      await setDoc(userRef, initialData, { merge: true });
      console.log('Perfil de usuario inicializado/actualizado para:', uid);
    } catch (err: any) {
      console.error('Error al inicializar perfil de usuario:', err);
      setError(`No se pudo inicializar tu perfil: ${err.message || "desconocido"}.`);
    }
  };

  /**
   * Maneja los mensajes de error específicos de Firebase Authentication.
   * @param {any} err - El objeto de error de Firebase.
   */
  const handleAuthError = (err: any) => {
    let errorMessage = "Ocurrió un error inesperado durante la autenticación.";
    if (err.code) {
      switch (err.code) {
        case 'auth/email-already-in-use':
          errorMessage = "El correo electrónico ya está registrado. Intenta iniciar sesión.";
          break;
        case 'auth/invalid-email':
          errorMessage = "Formato de correo electrónico inválido.";
          break;
        case 'auth/operation-not-allowed':
          errorMessage = "La autenticación por Email/Contraseña no está habilitada. Contacta al soporte.";
          break;
        case 'auth/weak-password':
          errorMessage = "La contraseña debe tener al menos 6 caracteres.";
          break;
        case 'auth/user-not-found':
          errorMessage = "Usuario no encontrado. Verifica tu correo o regístrate.";
          break;
        case 'auth/wrong-password':
          errorMessage = "Contraseña incorrecta. Verifica tus credenciales.";
          break;
        case 'auth/popup-closed-by-user':
          errorMessage = "La ventana de inicio de sesión se cerró. Intenta de nuevo.";
          break;
        case 'auth/network-request-failed':
          errorMessage = "Problema de conexión a internet. Por favor, revisa tu conexión.";
          break;
        default:
          errorMessage = `Error de autenticación: ${err.message}`;
      }
    }
    setError(errorMessage);
  };

  /**
   * Maneja el registro o inicio de sesión con Email y Contraseña.
   * @param {React.FormEvent} e - Evento de formulario.
   */
  const handleEmailPasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validaciones específicas para el registro
    if (isRegistering) {
      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden.");
        setLoading(false);
        return;
      }
      if (!playerNameInput.trim()) {
        setError("Por favor, introduce un nombre para tu personaje.");
        setLoading(false);
        return;
      }
    }

    try {
      let userCredential: UserCredential;
      if (isRegistering) {
        userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        console.log("Usuario registrado con éxito!");
        // Inicializa el perfil del usuario inmediatamente después del registro
        await initializeUserProfile(userCredential.user.uid, userCredential.user.email, playerNameInput.trim());
      } else {
        userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
        console.log("Usuario ha iniciado sesión con éxito!");
        // Para logins existentes, también aseguramos que el perfil esté inicializado
        // Esto es útil si un usuario se loguea por primera vez con Email/Pass después de haber sido anónimo
        await initializeUserProfile(userCredential.user.uid, userCredential.user.email, userCredential.user.displayName || null);
      }
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja el inicio de sesión con Google.
   */
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(firebaseAuth, provider);
      console.log("Inicio de sesión con Google exitoso!");
      // Inicializa el perfil también para usuarios de Google
      await initializeUserProfile(userCredential.user.uid, userCredential.user.email, userCredential.user.displayName || null);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="card-glass p-8 md:p-10 rounded-2xl w-full max-w-md text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-6 header-glow">
          {isRegistering ? 'Crea Tu Jugador' : 'Inicia Sesión'}
        </h1>
        <p className="text-gray-300 text-lg mb-8">
          {isRegistering ? 'Define tu leyenda para el campo.' : 'Accede para continuar tu camino.'}
        </p>

        {error && (
          <div className="bg-red-700 bg-opacity-30 text-red-200 p-3 rounded-md mb-6 border border-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailPasswordAuth} className="space-y-6">
          <input
            type="email"
            placeholder="Correo Electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            required
          />
          {isRegistering && (
            <>
              <input
                type="password"
                placeholder="Confirmar Contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                required
              />
              <input
                type="text"
                placeholder="Nombre de tu Jugador (ej: 'El Huracán')"
                value={playerNameInput}
                onChange={(e) => setPlayerNameInput(e.target.value)}
                className="input-field"
                required
              />
              <p className="text-gray-400 text-sm mt-2">Este será el nombre de tu carta FIFA y tu billetera.</p>
            </>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 btn-primary text-white text-lg rounded-full shadow-xl"
          >
            {loading ? 'Cargando...' : isRegistering ? 'Crear Jugador y Registrarme' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-8 relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-700"></span>
          </div>
          <div className="relative bg-gray-900 px-4 text-sm text-gray-400">
            O
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="mt-8 w-full px-6 py-3 btn-secondary text-white text-lg rounded-full shadow-xl flex items-center justify-center gap-3"
        >
          {loading ? 'Cargando...' : (
            <>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.24 10.27v-2.85h6.63c-.15-1.12-.92-2.31-2.03-3.15l-1.63 1.63c.89.65 1.57 1.56 1.9 2.58l-4.9-1.21z" fill="#4285F4"/>
                <path d="M12.24 17.5c-2.33 0-4.32-.97-5.76-2.58l1.63-1.63c.87.9 2.05 1.48 3.32 1.48 1.43 0 2.65-.62 3.54-1.63l1.81 1.81c-1.11 1.02-2.58 1.7-4.18 1.7zm-6.24-5.27h-2.85c-.15 1.12-.92 2.31-2.03 3.15l-1.63-1.63c.89-.65 1.57-1.56 1.9-2.58l-4.9 1.21z" fill="#34A853"/>
                <path d="M12.24 6.73c2.33 0 4.32.97 5.76 2.58l-1.63 1.63c-.87-.9-2.05-1.48-3.32-1.48-1.43 0-2.65.62-3.54 1.63l-1.81-1.81c1.11-1.02 2.58-1.7 4.18-1.7zm6.24 5.27h-2.85c-.15-1.12-.92-2.31-2.03-3.15l-1.63 1.63c.89.65 1.57 1.56 1.9 2.58l-4.9-1.21z" fill="#FBBC04"/>
                <path d="M22.56 12.24c0-.98-.09-1.82-.25-2.62h-10.32v4.95h6.16c-.25 1.13-.86 2.1-1.78 2.87l-.02.01 3.99 3.88.06.05c2.73-2.52 4.31-6.19 4.31-10.14z" fill="#EA4335"/>
              </svg>
              Google
            </>
          )}
        </button>

        <p className="mt-8 text-gray-400">
          {isRegistering ? (
            <>¿Ya tienes una cuenta? <button onClick={() => setIsRegistering(false)} className="text-blue-400 hover:underline font-bold">Iniciar Sesión</button></>
          ) : (
            <>¿No tienes una cuenta? <button onClick={() => setIsRegistering(true)} className="text-blue-400 hover:underline font-bold">Regístrate</button></>
          )}
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;
