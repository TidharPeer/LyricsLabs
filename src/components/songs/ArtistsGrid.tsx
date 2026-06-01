import { useMemo } from 'react'
import { Users } from 'lucide-react'
import type { Song } from '@/types'

interface Props {
  songs: Song[]
  query: string
  onArtistClick: (artist: string) => void
}

export function ArtistsGrid({ songs, query, onArtistClick }: Props) {
  const artists = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of songs) {
      if (s.artist) map.set(s.artist, (map.get(s.artist) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [songs])

  const filtered = query
    ? artists.filter(([a]) => a.toLowerCase().includes(query.toLowerCase()))
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
      {filtered.map(([artist, count]) => (
        <button
          key={artist}
          onClick={() => onArtistClick(artist)}
          className="group rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/50"
        >
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-background">
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="truncate font-medium">{artist}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {count} song{count !== 1 ? 's' : ''}
          </p>
        </button>
      ))}
    </div>
  )
}
