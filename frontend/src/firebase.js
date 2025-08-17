// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDvG4taMw7bn4_a7SJE4kJpr3VAKXM7iBI",
  authDomain: "lupiapp-8.firebaseapp.com",
  projectId: "lupiapp-8",
  storageBucket: "lupiapp-8.firebasestorage.app",
  messagingSenderId: "781776125623",
  appId: "1:781776125623:web:5f1db9cf8abcf837bf9732",
  measurementId: "G-0RRJBB9S92"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);