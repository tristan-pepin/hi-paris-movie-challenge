import { useEffect, useRef } from 'react'

export default function MovieDrawer({ onClose }) {
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    const handleKey = (e) => e.key === 'Escape' && onCloseRef.current()
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-zinc-900 z-50 shadow-xl overflow-y-auto p-6">
        <button
          onClick={onClose}
          className="mb-4 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ✕ Fermer
        </button>
        <div className="space-y-4 animate-pulse">
          <div className="h-96 bg-zinc-200 dark:bg-zinc-700 rounded-lg" />
          <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4" />
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/4" />
          <div className="h-24 bg-zinc-200 dark:bg-zinc-700 rounded" />
        </div>
        <p className="text-sm text-zinc-400 mt-6 text-center">Développement en cours</p>
      </div>
    </>
  )
}
