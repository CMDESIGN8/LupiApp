import React, { useEffect, useState } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

import AuthScreen from './components/AuthScreen';
import DashboardScreen from './components/DashboardScreen';

import { firebaseApp, firebaseAuth, firestoreDb } from './firebase';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged(user => {
      setCurrentUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div>Cargando Lupi App...</div>;

  return currentUser ? (
    <DashboardScreen
      appId="lupi-app"
      firestoreDb={firestoreDb}
      firebaseAuth={firebaseAuth}
      currentUser={currentUser}
    />
  ) : (
    <AuthScreen
      appId="lupi-app"
      firestoreDb={firestoreDb}
      firebaseAuth={firebaseAuth}
    />
  );
};

export default App;
