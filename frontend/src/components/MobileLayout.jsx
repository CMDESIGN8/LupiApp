export const MobileLayout = ({ children }) => {
  return (
    <div className="mobile-container">
      <div className="mobile-screen">
        <div className="status-bar">
          <span>Lupi App</span>
          <span>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        <main className="mobile-content">
          {children}
        </main>
        <nav className="mobile-nav">
          <button>🏠 Inicio</button>
          <button>👤 Perfil</button>
          <button>⚽ Partidos</button>
          <button>🛒 Tienda</button>
        </nav>
      </div>
    </div>
  );
};