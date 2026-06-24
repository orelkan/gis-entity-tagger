import { Link, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          GIS Text Tagger
        </Link>
        <nav>
          <Link to="/">Dashboard</Link>
          <Link to="/entities">Entities</Link>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
