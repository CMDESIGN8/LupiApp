import React, { useState } from 'react';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, UserCredential } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

interface AuthScreenProps {
  appId: string;
  firestoreDb: Firestore;
  firebaseAuth: Auth;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ appId, firestoreDb, firebaseAuth }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const userCredential: UserCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      console.log('Usuario logueado', userCredential.user.uid);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegister = async () => {
    try {
      const userCredential: UserCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      console.log('Usuario registrado', userCredential.user.uid);

      // Inicializar perfil
      const userRef = doc(firestoreDb, `artifacts/${appId}/users/${userCredential.user.uid}/profile`, 'userData');
      await setDoc(userRef, { xp: 0, level: 1, coins: 0 }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h1>AuthScreen</h1>
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
      <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" />
      <button onClick={handleLogin}>Login</button>
      <button onClick={handleRegister}>Register</button>
    </div>
  );
};

export default AuthScreen;
