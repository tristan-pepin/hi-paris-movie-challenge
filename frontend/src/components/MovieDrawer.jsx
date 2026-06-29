import { useState, useEffect, useRef } from 'react'
import { api } from '../api/client'

const scoreColor = (avg) =>
  avg >= 7 ? 'bg-green-500' : avg >= 5 ? 'bg-amber-500' : 'bg-red-500'

export default function MovieDrawer({ movieId, onSelect, onClose, selectionAvg }) {
  const [movie, setMovie] = useState(null)
  const [similar, setSimilar] = useState([])
  const [statsOpen, setStatsOpen] = useState(false)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    setMovie(null)
    setSimilar([])
    setStatsOpen(false)
    Promise.all([
      api.get(`/movies/${movieId}`),
      api.post('/recommendations', { movie_id: movieId }),
    ]).then(([{ data: detail }, { data: recs }]) => {
      setMovie(detail)
      setSimilar(recs)
    })
  }, [movieId])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCloseRef.current()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-zinc-900 z-50 shadow-xl overflow-y-auto">
        <div className="p-4 flex justify-end">
          <button
            onClick={onClose}
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ✕ Fermer
          </button>
        </div>

        {!movie ? (
          <div className="p-4 space-y-4 animate-pulse">
            <div className="aspect-[2/3] bg-zinc-200 dark:bg-zinc-700 rounded-lg" />
            <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4" />
            <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3" />
            <div className="h-24 bg-zinc-200 dark:bg-zinc-700 rounded" />
          </div>
        ) : (
          <div>
            {movie.poster_url && (
              <img src={movie.poster_url} alt={movie.title} className="w-full" />
            )}
            <div className="p-4 space-y-3">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                {movie.title}
              </h2>

              <p className="text-sm text-zinc-500">
                {movie.release_year}
                {movie.original_language && ` · ${movie.original_language.toUpperCase()}`}
              </p>

              <div className="flex flex-wrap gap-1">
                {movie.genres?.map((g) => (
                  <span key={g} className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded px-2 py-0.5">
                    {g}
                  </span>
                ))}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  {movie.vote_average != null && (
                    <span className={`text-sm font-bold text-white rounded px-2 py-0.5 ${scoreColor(movie.vote_average)}`}>
                      {movie.vote_average.toFixed(1)}
                    </span>
                  )}
                  {movie.vote_count != null && (
                    <span className="text-sm text-zinc-400">{movie.vote_count.toLocaleString()} votes</span>
                  )}
                  <button
                    onClick={() => setStatsOpen((o) => !o)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 ml-auto"
                  >
                    {statsOpen ? 'masquer' : 'stats ▾'}
                  </button>
                </div>

                {statsOpen && (() => {
                  const similarRatings = similar.map((m) => m.vote_average).filter((v) => v != null)
                  const similarAvg = similarRatings.length
                    ? (similarRatings.reduce((a, b) => a + b, 0) / similarRatings.length).toFixed(1)
                    : null
                  return (
                    <div className="text-xs text-zinc-400 space-y-1 pl-2 border-l border-zinc-700 ml-1">
                      <div className="flex justify-between gap-4 text-zinc-600 italic pb-0.5">
                        <span></span><span>note moy.</span>
                      </div>
                      {movie.genres?.map((genre) => (
                        <div key={genre} className="flex justify-between gap-4">
                          <span>{genre}</span>
                          <span className="text-zinc-300">
                            {movie.genre_avgs?.[genre] != null ? movie.genre_avgs[genre].toFixed(1) : '—'}
                          </span>
                        </div>
                      ))}
                      {similarAvg && (
                        <div className="flex justify-between gap-4 pt-1 border-t border-zinc-800">
                          <span>films similaires</span>
                          <span className="text-zinc-300">{similarAvg}</span>
                        </div>
                      )}
                      {selectionAvg != null && (
                        <div className="flex justify-between gap-4 pt-1 border-t border-zinc-800">
                          <span>sélection en cours</span>
                          <span className="text-zinc-300">{selectionAvg.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {movie.overview && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {movie.overview}
                </p>
              )}

              {similar.length > 0 && (
                <div className="pt-2 space-y-2">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Films similaires
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {similar.map((m) => (
                      <div
                        key={m.movie_id}
                        onClick={() => onSelect(m.movie_id)}
                        className="cursor-pointer rounded overflow-hidden hover:opacity-75 transition-opacity"
                      >
                        {m.poster_url ? (
                          <img src={m.poster_url} alt={m.title} className="w-full aspect-[2/3] object-cover" />
                        ) : (
                          <div className="w-full aspect-[2/3] bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs text-zinc-400 p-1 text-center">
                            {m.title}
                          </div>
                        )}
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                          {m.title}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
