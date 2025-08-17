import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import type { Auth, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import AuthScreen from './components/AuthScreen.tsx';
import DashboardScreen from './components/DashboardScreen.tsx';

const App = () => {
  // --- Variables de entorno ---
  const rawAppId = import.meta.env.VITE_REACT_APP_APP_ID;
  const rawFirebaseConfig = import.meta.env.VITE_REACT_APP_FIREBASE_CONFIG;

  const appId = rawAppId || 'default-lupi-app-id';
  const firebaseConfig = rawFirebaseConfig ? JSON.parse(rawFirebaseConfig) : {};

  // --- Estados ---
  const [firestoreDb, setFirestoreDb] = useState<Firestore | null>(null);
  const [firebaseAuth, setFirebaseAuth] = useState<Auth | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Inicialización de Firebase ---
  useEffect(() => {
    const initFirebase = async () => {
      try {
        if (Object.keys(firebaseConfig).length === 0) {
          setError("Error de configuración de Firebase. Contacta al soporte.");
          setLoading(false);
          return;
        }

        const app: FirebaseApp = initializeApp(firebaseConfig);
        const db: Firestore = getFirestore(app);
        const auth: Auth = getAuth(app);

        setFirestoreDb(db);
        setFirebaseAuth(auth);

        const unsubscribe = onAuthStateChanged(auth, (user) => {
          setCurrentUser(user);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (err: any) {
        setError(`Error al cargar la aplicación: ${err.message || "desconocido"}`);
        setLoading(false);
      }
    };

    initFirebase();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-xl animate-pulse">Cargando Lupi App...</div>
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
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      <style>{`
        body { font-family: 'Inter', sans-serif; }
        .card-glass { /* ...tu estilo... */ }
        .btn-primary { /* ... */ }
        /* Resto de estilos */
      `}</style>

      {currentUser ? (
        <DashboardScreen
          appId={appId}
          firestoreDb={firestoreDb!} // asegura que no es null
          firebaseAuth={firebaseAuth!}
          currentUser={currentUser}
        />
      ) : (
        <AuthScreen
          appId={appId}
          firestoreDb={firestoreDb!}
          firebaseAuth={firebaseAuth!}
        />
      )}
    </div>
  );
};

export default App;
