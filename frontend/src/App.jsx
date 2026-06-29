import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import MovieList from './pages/MovieList'

function WIP({ label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-zinc-400">
      <span className="text-4xl">🚧</span>
      <p className="font-medium text-zinc-600 dark:text-zinc-300">{label}</p>
      <p className="text-sm">Développement en cours</p>
    </div>
  )
}

const navLinks = [
  { to: '/', label: 'Films' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/map', label: 'Carte' },
]

export default function App() {
  return (
    <BrowserRouter>
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center gap-6">
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">Movie Explorer</span>
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
          <Route path="/analytics" element={<WIP label="Analytics" />} />
          <Route path="/map" element={<WIP label="Carte des embeddings" />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
