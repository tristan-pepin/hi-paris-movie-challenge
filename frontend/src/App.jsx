import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import MovieList from './pages/MovieList'
import EmbeddingMap from './pages/EmbeddingMap'


const navLinks = [
  { to: '/', label: 'Movies' },
  { to: '/map', label: 'Map' },
]

export default function App() {
  return (
    <BrowserRouter>
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center gap-6">
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">Movie explorer</span>
        <nav className="flex gap-4">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `text-sm ${isActive ? 'text-violet-600 dark:text-violet-400 font-medium' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<MovieList />} />
          <Route path="/map" element={<EmbeddingMap />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
