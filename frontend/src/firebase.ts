import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import type { FirebaseApp, Auth, Firestore } from 'firebase/app';

const firebaseConfig = JSON.parse(import.meta.env.VITE_REACT_APP_FIREBASE_CONFIG || '{}');

export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth: Auth = getAuth(firebaseApp);
export const firestoreDb: Firestore = getFirestore(firebaseApp);
