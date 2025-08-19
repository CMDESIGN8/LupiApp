import './MobileLayout.css'

export const MobileLayout = ({ children }) => {
  return (
    <div className="mobile-container">
      <div className="mobile-screen">
        <div className="status-bar">
          <span>Lupi App</span>
          <span>12:30</span>
        </div>
        <main className="mobile-content">
          {children}
        </main>
        <nav className="mobile-nav">
          <button>🏠</button>
          <button>👤</button>
          <button>⚽</button>
          <button>🛒</button>
        </nav>
      </div>
    </div>
  )
}