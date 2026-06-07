import { useMemo, useState } from 'react'
import type { Song } from '@/types'

const GRADIENTS = [
  'from-violet-700 to-violet-900',
  'from-blue-700 to-blue-900',
  'from-emerald-700 to-emerald-900',
  'from-rose-700 to-rose-900',
  'from-amber-600 to-amber-900',
  'from-teal-700 to-teal-900',
  'from-pink-700 to-pink-900',
  'from-indigo-700 to-indigo-900',
  'from-orange-700 to-orange-900',
  'from-cyan-700 to-cyan-900',
]

function artistGradient(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return GRADIENTS[Math.abs(h) % GRADIENTS.length]
}

function ArtistCard({ artist, count, youtubeId, onClick }: {
  artist: string
  count: number
  youtubeId: string
  onClick: () => void
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const showImg = !!youtubeId && !imgFailed

  return (
    <button
      onClick={onClick}
      className="group relative aspect-square overflow-hidden rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {showImg ? (
        <img
          src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
          alt={artist}
          onError={() => setImgFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${artistGradient(artist)}`} />
      )}

      {/* Bottom-weighted dark gradient so text is always legible */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

      {/* Subtle hover brighten */}
      <div className="absolute inset-0 bg-white/0 transition-colors group-hover:bg-white/10" />

      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="truncate text-sm font-semibold leading-snug text-white drop-shadow">{artist}</p>
        <p className="mt-0.5 text-xs text-white/70">{count} song{count !== 1 ? 's' : ''}</p>
      </div>
    </button>
  )
}

interface Props {
  songs: Song[]
  query: string
  onArtistClick: (artist: string) => void
}

export function ArtistsGrid({ songs, query, onArtistClick }: Props) {
  const artists = useMemo(() => {
    const map = new Map<string, { count: number; youtubeId: string }>()
    for (const s of songs) {
      if (!s.artist) continue
      if (!map.has(s.artist)) map.set(s.artist, { count: 0, youtubeId: s.youtubeId ?? '' })
      const entry = map.get(s.artist)!
      entry.count++
      // prefer a song that has a YouTube ID so we always get an image if possible
      if (!entry.youtubeId && s.youtubeId) entry.youtubeId = s.youtubeId
    }
    return [...map.entries()]
      .map(([artist, { count, youtubeId }]) => ({ artist, count, youtubeId }))
      .sort((a, b) => a.artist.localeCompare(b.artist))
  }, [songs])

  const filtered = query
    ? artists.filter(({ artist }) => artist.toLowerCase().includes(query.toLowerCase()))
    : artists

  if (filtered.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {query ? `No artists match "${query}"` : 'No artists yet.'}
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {filtered.map(({ artist, count, youtubeId }) => (
        <ArtistCard
          key={artist}
          artist={artist}
          count={count}
          youtubeId={youtubeId}
          onClick={() => onArtistClick(artist)}
        />
      ))}
    </div>
  )
}
