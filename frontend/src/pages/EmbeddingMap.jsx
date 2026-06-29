import { useState, useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import { api } from '../api/client'
import MovieDrawer from '../components/MovieDrawer'

const GENRE_COLORS = [
  ['Action',          '#ef4444'],
  ['Drama',           '#8b5cf6'],
  ['Comedy',          '#f59e0b'],
  ['Thriller',        '#06b6d4'],
  ['Horror',          '#ec4899'],
  ['Romance',         '#f97316'],
  ['Science Fiction', '#3b82f6'],
  ['Animation',       '#10b981'],
  ['Crime',           '#84cc16'],
  ['Adventure',       '#a78bfa'],
  ['Fantasy',         '#fb923c'],
  ['Documentary',     '#6b7280'],
]
const COLOR_MAP = Object.fromEntries(GENRE_COLORS)
const DEFAULT_COLOR = '#94a3b8'

function genreColor(genre) {
  return COLOR_MAP[genre] ?? DEFAULT_COLOR
}

const POINT_R = 2.5

export default function EmbeddingMap() {
  const canvasRef = useRef(null)
  const transformRef = useRef(d3.zoomIdentity)
  const pointsRef = useRef([])
  const [tooltip, setTooltip] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [embeddingsReady, setEmbeddingsReady] = useState(true)
  const [search, setSearch] = useState('')
  const searchRef = useRef('')
  const scalesRef = useRef(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !scalesRef.current) return
    const ctx = canvas.getContext('2d')
    const { width, height } = canvas
    const t = transformRef.current
    const { xScale, yScale } = scalesRef.current

    ctx.clearRect(0, 0, width, height)
    ctx.save()
    ctx.translate(t.x, t.y)
    ctx.scale(t.k, t.k)

    const query = searchRef.current.toLowerCase()
    for (const p of pointsRef.current) {
      const matches = !query || p.title.toLowerCase().includes(query)
      ctx.beginPath()
      ctx.arc(xScale(p.x), yScale(p.y), POINT_R / t.k, 0, Math.PI * 2)
      ctx.fillStyle = matches ? genreColor(p.genre) : '#3f3f46'
      ctx.globalAlpha = matches ? 0.85 : 0.3
      ctx.fill()
    }

    ctx.restore()
  }, [])

  useEffect(() => {
    api.get('/analytics/projection').then(({ data }) => {
      if (data.length === 0) {
        setEmbeddingsReady(false)
        setLoading(false)
        return
      }
      pointsRef.current = data
      const canvas = canvasRef.current
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      canvas.width = width
      canvas.height = height

      const xs = d3.extent(data, (d) => d.x)
      const ys = d3.extent(data, (d) => d.y)
      const pad = 0.05
      const xPad = (xs[1] - xs[0]) * pad
      const yPad = (ys[1] - ys[0]) * pad

      scalesRef.current = {
        xScale: d3.scaleLinear([xs[0] - xPad, xs[1] + xPad], [0, width]),
        yScale: d3.scaleLinear([ys[0] - yPad, ys[1] + yPad], [height, 0]),
      }

      setLoading(false)
      draw()

      const zoom = d3.zoom()
        .scaleExtent([0.5, 20])
        .on('zoom', (event) => {
          transformRef.current = event.transform
          draw()
        })

      d3.select(canvas).call(zoom)
    })
  }, [draw])

  const handleMouseMove = useCallback((e) => {
    if (!scalesRef.current || pointsRef.current.length === 0) return
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const t = transformRef.current
    const { xScale, yScale } = scalesRef.current

    const mx = (e.clientX - rect.left - t.x) / t.k
    const my = (e.clientY - rect.top - t.y) / t.k

    const query = searchRef.current.toLowerCase()
    let best = null
    let bestDist = Infinity
    for (const p of pointsRef.current) {
      if (query && !p.title.toLowerCase().includes(query)) continue
      const dx = xScale(p.x) - mx
      const dy = yScale(p.y) - my
      const d = dx * dx + dy * dy
      if (d < bestDist) { bestDist = d; best = p }
    }

    const threshold = (12 / t.k) ** 2
    if (best && bestDist < threshold) {
      setTooltip({ point: best, cx: e.clientX, cy: e.clientY })
    } else {
      setTooltip(null)
    }
  }, [])

  const handleClick = useCallback(() => {
    if (tooltip) setSelectedId(tooltip.point.movie_id)
  }, [tooltip])

  function handleSearch(value) {
    searchRef.current = value
    setSearch(value)
    draw()
  }

  return (
    <div className="relative w-full h-[calc(100vh-57px)] bg-zinc-950 overflow-hidden">
      {!embeddingsReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
          <p className="text-zinc-200 font-semibold text-lg">Embedding map unavailable</p>
          <p className="text-zinc-400 text-sm max-w-sm">
            Set <code className="text-amber-400">OPENAI_API_KEY</code> in <code className="text-amber-400">backend/.env</code> and restart the server to compute embeddings and enable this view.
          </p>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-sm">
          Computing projection…
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        onClick={handleClick}
        style={{ cursor: tooltip ? 'pointer' : 'grab' }}
      />

      {/* Recherche */}
      {!loading && (
        <div className="absolute top-3 right-3">
          <input
            type="search"
            placeholder="Search a title…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-52 border border-zinc-600 rounded px-3 py-1.5 text-sm bg-zinc-900/80 backdrop-blur text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
          />
        </div>
      )}

      {/* Légende */}
      {!loading && (
        <div className="absolute top-3 left-3 bg-zinc-900/80 backdrop-blur rounded-lg p-3 space-y-1">
          {GENRE_COLORS.map(([genre, color]) => (
            <div key={genre} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-xs text-zinc-300">{genre}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: DEFAULT_COLOR }} />
            <span className="text-xs text-zinc-400">Other</span>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 bg-zinc-900 border border-zinc-700 rounded-lg p-2 shadow-xl flex gap-2"
          style={{ left: tooltip.cx + 14, top: tooltip.cy - 40 }}
        >
          {tooltip.point.poster_url && (
            <img src={tooltip.point.poster_url} alt="" className="w-10 aspect-[2/3] object-cover rounded" />
          )}
          <div className="flex flex-col justify-center min-w-0">
            <p className="text-xs font-semibold text-white leading-tight line-clamp-2 max-w-36">
              {tooltip.point.title}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">{tooltip.point.release_year}</p>
            {tooltip.point.vote_average != null && (
              <p className="text-xs text-zinc-300">{tooltip.point.vote_average.toFixed(1)} / 10</p>
            )}
          </div>
        </div>
      )}

      {selectedId != null && (
        <MovieDrawer
          movieId={selectedId}
          onSelect={setSelectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
