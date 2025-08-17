// src/main.jsx (o src/index.js)
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // Asegúrate de que la ruta sea correcta

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);