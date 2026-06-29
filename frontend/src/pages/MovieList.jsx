import { useState, useEffect } from 'react'
import { api } from '../api/client'
import MovieCard from '../components/MovieCard'
import MovieDrawer from '../components/MovieDrawer'

const LIMIT = 24

const SELECT_CLS = 'border border-zinc-300 dark:border-zinc-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'

function FilterSelect({ value, onChange, children }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={SELECT_CLS}>
      {children}
    </select>
  )
}

export default function MovieList() {
  const [movies, setMovies] = useState([])
  const [total, setTotal] = useState(0)
  const [meta, setMeta] = useState({ genres: [], languages: [] })
  const [selectedId, setSelectedId] = useState(null)
  const [filters, setFilters] = useState({ search: '', genre: '', lang: '', page: 1 })

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  useEffect(() => {
    api.get('/movies/meta').then((res) => setMeta(res.data))
  }, [])

  useEffect(() => {
    const params = { page: filters.page, limit: LIMIT }
    if (filters.search) params.search = filters.search
    if (filters.genre) params.genre = filters.genre
    if (filters.lang) params.lang = filters.lang
    api.get('/movies', { params }).then((res) => {
      setMovies(res.data.results)
      setTotal(res.data.total)
    })
  }, [filters])

  function setFilter(key, val) {
    setFilters((f) => ({ ...f, [key]: val, page: 1 }))
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Rechercher un titre…"
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
          className={`${SELECT_CLS} flex-1 min-w-40`}
        />
        <FilterSelect value={filters.genre} onChange={(v) => setFilter('genre', v)}>
          <option value="">Tous les genres</option>
          {meta.genres.map((g) => <option key={g} value={g}>{g}</option>)}
        </FilterSelect>
        <FilterSelect value={filters.lang} onChange={(v) => setFilter('lang', v)}>
          <option value="">Toutes les langues</option>
          {meta.languages.map((l) => <option key={l} value={l}>{l}</option>)}
        </FilterSelect>
        <span className="self-center text-xs text-zinc-400">{total} films</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {movies.map((movie) => (
          <MovieCard key={movie.movie_id} movie={movie} onClick={() => setSelectedId(movie.movie_id)} />
        ))}
      </div>

      <div className="flex items-center justify-center gap-4 pt-2">
        <button
          disabled={filters.page === 1}
          onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
          className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          ← Précédent
        </button>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          Page {filters.page} / {totalPages}
        </span>
        <button
          disabled={filters.page === totalPages}
          onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
          className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Suivant →
        </button>
      </div>

      {selectedId != null && (
        <MovieDrawer onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}
