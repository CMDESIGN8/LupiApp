import React, { useState } from 'react';
import type { Auth, User } from 'firebase/auth';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, UserCredential } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { doc, setDoc } from 'firebase/firestore';

interface AuthScreenProps {
  appId: string;
  firestoreDb: Firestore;
  firebaseAuth: Auth;
}

interface CardStats {
  overallRating: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physicality: number;
}

interface InitialUserData {
  xp: number;
  level: number;
  coins: number;
  badges: string[];
  skills: Record<string, number>;
  skillPoints: number;
  completedMissions: string[];
  currentClub: string | null;
  lastLogin: string;
  playerName: string;
  playerImage: string;
  cardStats: CardStats;
  wallet: {
    name: string;
    balance: number;
  };
}

const AuthScreen: React.FC<AuthScreenProps> = ({ appId, firestoreDb, firebaseAuth }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [playerNameInput, setPlayerNameInput] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeUserProfile = async (uid: string, userEmail: string | null, userName: string | null) => {
    const userRef = doc(firestoreDb, `artifacts/${appId}/users/${uid}/profile`, 'userData');

    const baseName = userName?.toLowerCase().replace(/\s+/g, '') || (userEmail?.split('@')[0]?.toLowerCase() || 'usuario');
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
      playerName: userName || (userEmail?.split('@')[0] || 'Jugador Lupi'),
      playerImage: "https://placehold.co/150x150/007bff/FFFFFF?text=Lupi",
      cardStats: {
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

    await setDoc(userRef, initialData, { merge: true });
  };

  const handleAuthError = (err: any) => {
    let errorMessage = 'Ocurrió un error inesperado.';
    if (err.code) {
      switch (err.code) {
        case 'auth/email-already-in-use': errorMessage = 'El correo ya está registrado.'; break;
        case 'auth/invalid-email': errorMessage = 'Correo inválido.'; break;
        case 'auth/weak-password': errorMessage = 'Contraseña débil.'; break;
        case 'auth/user-not-found': errorMessage = 'Usuario no encontrado.'; break;
        case 'auth/wrong-password': errorMessage = 'Contraseña incorrecta.'; break;
        case 'auth/popup-closed-by-user': errorMessage = 'Ventana cerrada.'; break;
        case 'auth/network-request-failed': errorMessage = 'Problema de conexión.'; break;
        default: errorMessage = `Error: ${err.message}`; break;
      }
    }
    setError(errorMessage);
  };

  const handleEmailPasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isRegistering) {
      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden.");
        setLoading(false);
        return;
      }
      if (!playerNameInput.trim()) {
        setError("Introduce un nombre para tu personaje.");
        setLoading(false);
        return;
      }
    }

    try {
      let userCredential: UserCredential;
      if (isRegistering) {
        userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        await initializeUserProfile(userCredential.user.uid, userCredential.user.email, playerNameInput.trim());
      } else {
        userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
        await initializeUserProfile(userCredential.user.uid, userCredential.user.email, userCredential.user.displayName || null);
      }
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(firebaseAuth, provider);
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
        <h1 className="text-4xl font-extrabold mb-6">{isRegistering ? 'Crea Tu Jugador' : 'Inicia Sesión'}</h1>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <form onSubmit={handleEmailPasswordAuth} className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          {isRegistering && (
            <>
              <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
              <input type="text" placeholder="Nombre de tu Jugador" value={playerNameInput} onChange={e => setPlayerNameInput(e.target.value)} required />
            </>
          )}
          <button type="submit" disabled={loading}>{loading ? 'Cargando...' : isRegistering ? 'Registrarme' : 'Login'}</button>
        </form>
        <button onClick={handleGoogleSignIn} disabled={loading} className="mt-4">Sign in with Google</button>
        <p className="mt-4">
          {isRegistering ? (
            <>¿Ya tienes cuenta? <button onClick={() => setIsRegistering(false)}>Login</button></>
          ) : (
            <>¿No tienes cuenta? <button onClick={() => setIsRegistering(true)}>Regístrate</button></>
          )}
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;
