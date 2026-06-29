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

function yearOptions(yearRange) {
  if (!yearRange) return []
  const decades = []
  const start = Math.floor(yearRange.min / 10) * 10
  for (let y = start; y <= yearRange.max; y += 10) decades.push(y)
  return decades
}

export default function MovieList() {
  const [movies, setMovies] = useState([])
  const [total, setTotal] = useState(0)
  const [avgRating, setAvgRating] = useState(null)
  const [meta, setMeta] = useState({ genres: [], languages: [], genre_stats: {}, language_counts: {}, year_range: null, embeddings_ready: true })
  const [selectedId, setSelectedId] = useState(null)
  const [filters, setFilters] = useState({ search: '', genre: '', lang: '', year_min: '', rating_min: '', page: 1 })

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  useEffect(() => {
    api.get('/movies/meta').then((res) => setMeta(res.data))
  }, [])

  useEffect(() => {
    const params = { page: filters.page, limit: LIMIT }
    if (filters.search) params.search = filters.search
    if (filters.genre) params.genre = filters.genre
    if (filters.lang) params.lang = filters.lang
    if (filters.year_min) params.year_min = filters.year_min
    if (filters.rating_min) params.rating_min = filters.rating_min
    api.get('/movies', { params }).then((res) => {
      setMovies(res.data.results)
      setTotal(res.data.total)
      setAvgRating(res.data.avg_rating)
    })
  }, [filters])

  function setFilter(key, val) {
    setFilters((f) => ({ ...f, [key]: val, page: 1 }))
  }

  const selectedGenreStat = filters.genre ? meta.genre_stats?.[filters.genre] : null

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Search a title…"
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
          className={`${SELECT_CLS} flex-1 min-w-40`}
        />
        <FilterSelect value={filters.genre} onChange={(v) => setFilter('genre', v)}>
          <option value="">All genres</option>
          {meta.genres.map((g) => (
            <option key={g} value={g}>
              {g}{meta.genre_stats?.[g] ? ` (${meta.genre_stats[g].count})` : ''}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={filters.lang} onChange={(v) => setFilter('lang', v)}>
          <option value="">All languages</option>
          {meta.languages.map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()}{meta.language_counts?.[l] ? ` (${meta.language_counts[l]})` : ''}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={filters.year_min} onChange={(v) => setFilter('year_min', v)}>
          <option value="">All years</option>
          {yearOptions(meta.year_range).map((y) => (
            <option key={y} value={y}>From {y}</option>
          ))}
        </FilterSelect>
        <FilterSelect value={filters.rating_min} onChange={(v) => setFilter('rating_min', v)}>
          <option value="">All ratings</option>
          {[5, 6, 7, 8, 9].map((n) => (
            <option key={n} value={n}>{n}+ / 10</option>
          ))}
        </FilterSelect>
      </div>

      {/* Barre de stats contextuelle */}
      <div className="flex items-center gap-3 text-xs text-zinc-400 -mt-1">
        <span>{total.toLocaleString('en-US')} movies</span>
        {avgRating != null && (
          <span>· avg rating <span className="text-zinc-300 font-medium">{avgRating.toFixed(1)}</span></span>
        )}
        {selectedGenreStat && (
          <span>· avg {filters.genre} <span className="text-zinc-300 font-medium">{selectedGenreStat.avg_rating?.toFixed(1)}</span></span>
        )}
      </div>

      {!meta.embeddings_ready && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          <strong>Recommendations and map disabled.</strong> Set <code className="text-amber-300">OPENAI_API_KEY</code> in <code className="text-amber-300">backend/.env</code> and restart the server to enable semantic search and the embedding map.
        </div>
      )}

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
          ← Previous
        </button>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          Page {filters.page} of {totalPages}
        </span>
        <button
          disabled={filters.page === totalPages}
          onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
          className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Next →
        </button>
      </div>

      {selectedId != null && (
        <MovieDrawer
          movieId={selectedId}
          onSelect={setSelectedId}
          onClose={() => setSelectedId(null)}
          selectionAvg={avgRating}
        />
      )}
    </div>
  )
}
