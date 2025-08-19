import { useState, useEffect } from 'react';
import { MobileLayout } from './components/MobileLayout';
import { LoginScreen } from './screens/LoginScreen';
import { HomeScreen } from './screens/HomeScreen';
import { supabase } from './lib/supabase';
import './App.css';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sesión activa al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = () => {
    setSession(null); // ← Limpiar la sesión en el estado
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando Lupi App...</p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      {!session ? (
        <LoginScreen />
      ) : (
        <HomeScreen session={session} onSignOut={handleSignOut} />
      )}
    </MobileLayout>
  );
}

export default App;