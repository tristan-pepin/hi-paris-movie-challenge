export default function MovieCard({ movie, onClick }) {
  const { title, poster_url, vote_average, genres = [], release_year } = movie

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-lg overflow-hidden bg-white dark:bg-zinc-800 shadow hover:shadow-md transition-shadow"
    >
      <div className="aspect-[2/3] bg-zinc-200 dark:bg-zinc-700">
        {poster_url ? (
          <img src={poster_url} alt={title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-400 text-sm">Aucune image</div>
        )}
      </div>
      <div className="p-2 space-y-1">
        <div className="flex items-start justify-between gap-1">
          <p className="text-sm font-medium leading-tight line-clamp-2 text-zinc-900 dark:text-zinc-100">{title}</p>
          {vote_average != null && (
            <span className={`shrink-0 text-xs font-bold text-white rounded px-1.5 py-0.5 ${
              vote_average >= 7 ? 'bg-green-500' : vote_average >= 5 ? 'bg-amber-500' : 'bg-red-500'
            }`}>
              {vote_average.toFixed(1)}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-400">{release_year}</p>
        <div className="flex gap-1 flex-wrap">
          {genres.slice(0, 2).map((g) => (
            <span key={g} className="text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded px-1.5 py-0.5">
              {g}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
