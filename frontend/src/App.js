import React, { useState } from "react";
import Register from "./components/Register";
import Login from "./components/Login";

function App() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLogged, setIsLogged] = useState(false);

  return (
    <div>
      {!isLogged ? (
        !isRegistered ? (
          <Register onRegister={() => setIsRegistered(true)} />
        ) : (
          <Login onLogin={() => setIsLogged(true)} />
        )
      ) : (
        <h2>🎮 Bienvenido a Lupi Futbol RPG</h2>
      )}
    </div>
  );
}

export default App;
