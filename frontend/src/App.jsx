// src/App.jsx
import { useEffect } from "react";
import { auth } from "./firebaseConfig";
import { signInAnonymously } from "firebase/auth";

function App() {
  useEffect(() => {
    signInAnonymously(auth)
      .then(() => console.log("Conectado a Firebase ✅"))
      .catch((err) => console.error("Error Firebase ❌", err));
  }, []);

  return <h1>Hola Lupi 🚀</h1>;
}

export default App;
