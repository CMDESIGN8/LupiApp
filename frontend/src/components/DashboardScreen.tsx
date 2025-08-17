import React from 'react';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

interface DashboardScreenProps {
  appId: string;
  firestoreDb: Firestore;
  firebaseAuth: Auth;
  currentUser: User;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ currentUser }) => {
  return (
    <div>
      <h1>Bienvenido, {currentUser.email}</h1>
    </div>
  );
};

export default DashboardScreen;
