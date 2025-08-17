import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

// Importa los componentes de pantalla con la extensión .tsx explícita
// Asegúrate de que estos archivos existan en la ruta especificada
import AuthScreen from './components/AuthScreen.tsx';
import DashboardScreen from './components/DashboardScreen.tsx';

// =====================================================================
// === Código Principal de la Aplicación ===
// =====================================================================

const App = () => {
  // Accede a las variables de entorno de Vite.
  // Es CRÍTICO que los nombres de las variables en Render comiencen con VITE_REACT_APP_
  const rawAppId = import.meta.env.VITE_REACT_APP_APP_ID;
  const rawFirebaseConfig = import.meta.env.VITE_REACT_APP_FIREBASE_CONFIG;
  // El token inicial ya no se usa directamente para signInWithCustomToken aquí.
  // Se asume que signInAnonymously o registro/login manejará la autenticación.
  // Lo mantenemos por si Render lo inyecta como __initial_auth_token para pruebas específicas.
  // const rawInitialAuthToken = import.meta.env.VITE_REACT_APP_INITIAL_AUTH_TOKEN;

  // Usa los valores de las variables de entorno, con fallbacks para desarrollo local.
  const appId = rawAppId || 'default-lupi-app-id'; // Fallback para desarrollo local
  const firebaseConfig = rawFirebaseConfig ? JSON.parse(rawFirebaseConfig) : {}; // Fallback para desarrollo local

  // Estados de la aplicación
  const [firebaseApp, setFirebaseApp] = useState<FirebaseApp | null>(null);
  const [firestoreDb, setFirestoreDb] = useState<Firestore | null>(null);
  const [firebaseAuth, setFirebaseAuth] = useState<Auth | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Almacena el usuario autenticado
  const [loading, setLoading] = useState<boolean>(true); // Controla el estado de carga inicial de la app
  const [error, setError] = useState<string | null>(null); // Manejo de errores globales

  // --- 1. Inicialización de Firebase y Observación de Autenticación ---
  useEffect(() => {
    const initFirebase = async () => {
      try {
        // Verifica si la configuración de Firebase está vacía, lo que indica un problema de variables de entorno
        if (Object.keys(firebaseConfig).length === 0) {
          console.error("Firebase config is empty. Please check your environment variables.");
          setError("Error de configuración de Firebase. Contacta al soporte.");
          setLoading(false);
          return;
        }

        // Inicializa la aplicación Firebase y obtiene las instancias de Firestore y Auth
        const appInstance: FirebaseApp = initializeApp(firebaseConfig);
        const dbInstance: Firestore = getFirestore(appInstance);
        const authInstance: Auth = getAuth(appInstance);

        // Almacena las instancias en los estados
        setFirebaseApp(appInstance);
        setFirestoreDb(dbInstance);
        setFirebaseAuth(authInstance);

        // Configura un observador para el estado de autenticación de Firebase.
        // Este observador se disparará cada vez que el usuario inicie o cierre sesión, o que la sesión se restaure.
        const unsubscribe = onAuthStateChanged(authInstance, (user) => {
          setCurrentUser(user); // Actualiza el estado del usuario con la información de la sesión
          setLoading(false); // La carga se completa una vez que se resuelve la autenticación
        });

        // La función de limpieza se ejecuta cuando el componente se desmonta para evitar fugas de memoria
        return () => unsubscribe();

      } catch (err: any) {
        // Captura y gestiona cualquier error durante la inicialización de Firebase
        console.error("Error al inicializar Firebase:", err);
        setError(`Error al cargar la aplicación: ${err.message || "desconocido"}. Por favor, inténtelo de nuevo más tarde.`);
        setLoading(false);
      }
    };

    // Llama a la función de inicialización cuando el componente se monta
    initFirebase();
  }, []); // El array vacío de dependencias asegura que este efecto se ejecute solo una vez

  // Muestra un estado de carga mientras Firebase se inicializa y se verifica el estado de autenticación
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-xl animate-pulse">Cargando Lupi App...</div>
      </div>
    );
  }

  // Muestra un mensaje de error si la inicialización de Firebase falla
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-900 text-white p-4">
        <div className="text-xl text-center">Error: {error}</div>
      </div>
    );
  }

  // Renderiza AuthScreen si no hay un usuario autenticado, o DashboardScreen si lo hay.
  // Pasamos las instancias de Firebase a los componentes hijos para que puedan interactuar con la base de datos y la autenticación.
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-6 md:p-10 font-sans antialiased">
      {/* Carga de Tailwind CSS y fuente Inter */}
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      <style>
        {`
          body { font-family: 'Inter', sans-serif; }
          .card-glass {
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
            border-radius: 20px;
            transform: perspective(1000px) rotateY(0deg);
            transition: all 0.4s ease-in-out;
            will-change: transform, box-shadow;
          }
          .card-glass:hover {
            transform: perspective(1000px) rotateY(3deg) scale(1.02);
            box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.4);
          }
          .btn-primary {
            background: linear-gradient(135deg, #6366f1, #a855f7);
            transition: all 0.3s cubic-bezier(.25,.8,.25,1);
            box-shadow: 0 5px 15px rgba(99, 102, 241, 0.5);
            border-radius: 9999px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .btn-primary:hover {
            background: linear-gradient(135deg, #4f46e5, #9333ea);
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 8px 20px rgba(99, 102, 241, 0.7);
          }
          .btn-secondary {
            background: linear-gradient(135deg, #06b6d4, #3b82f6);
            transition: all 0.3s cubic-bezier(.25,.8,.25,1);
            box-shadow: 0 5px 15px rgba(6, 182, 212, 0.5);
            border-radius: 9999px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .btn-secondary:hover {
            background: linear-gradient(135deg, #0891b2, #2563eb);
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 8px 20px rgba(6, 182, 212, 0.7);
          }
          .btn-disabled {
            opacity: 0.4;
            cursor: not-allowed;
            background: #4a4a4a !important;
            box-shadow: none !important;
            transform: none !important;
          }
          .section-title {
            position: relative;
            display: inline-block;
            padding-bottom: 8px;
          }
          .section-title::after {
            content: '';
            position: absolute;
            left: 50%;
            bottom: 0;
            transform: translateX(-50%);
            width: 60px;
            height: 4px;
            background: linear-gradient(to right, #a855f7, #6366f1);
            border-radius: 2px;
            animation: pulse-border 2s infinite alternate;
          }
          @keyframes pulse-border {
            0% { transform: translateX(-50%) scaleX(1); opacity: 1; }
            100% { transform: translateX(-50%) scaleX(1.1); opacity: 0.8; }
          }
          .header-glow {
            animation: header-glow 3s infinite alternate;
          }
          @keyframes header-glow {
            0% { text-shadow: 0 0 5px rgba(168, 85, 247, 0.3); }
            100% { text-shadow: 0 0 15px rgba(168, 85, 247, 0.6); }
          }
          .badge-style {
            background: linear-gradient(45deg, #fbc02d, #f9a825);
            color: #212121;
            font-weight: bold;
            text-shadow: 0 1px 2px rgba(0,0,0,0.2);
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            transform: rotate(3deg);
            transition: transform 0.2s ease;
          }
          .badge-style:hover {
            transform: rotate(0deg) scale(1.05);
          }
          .user-id-anim {
            animation: slide-in 1s ease-out forwards;
            opacity: 0;
            display: inline-block;
          }
          @keyframes slide-in {
            0% { transform: translateY(10px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          .input-field {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 12px 20px;
            border-radius: 10px;
            color: white;
            font-size: 1rem;
            width: 100%;
            box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.2);
          }
          .input-field:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.5);
          }
        `}
      </style>

      {currentUser ? (
        // Si hay un usuario logueado, muestra el Dashboard
        <DashboardScreen
          appId={appId}
          firestoreDb={firestoreDb as Firestore} // Casteo si firestoreDb no es null
          firebaseAuth={firebaseAuth as Auth}    // Casteo si firebaseAuth no es null
          currentUser={currentUser}
        />
      ) : (
        // Si no hay usuario, muestra la pantalla de autenticación
        <AuthScreen
          appId={appId} // Pasa appId a AuthScreen para la inicialización del perfil
          firestoreDb={firestoreDb as Firestore} // Pasa firestoreDb a AuthScreen
          firebaseAuth={firebaseAuth as Auth} // Casteo si firebaseAuth no es null
        />
      )}
    </div>
  );
};

export default App;
