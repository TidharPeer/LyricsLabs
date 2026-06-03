import { useEffect, useState } from 'react'
import { SongCard } from '@/components/songs/SongCard'
import { fetchRecentSongs } from '@/lib/db'
import type { Song } from '@/types'

export function DiscoverSection() {
  const [songs, setSongs] = useState<Song[] | null>(null)

  useEffect(() => {
    fetchRecentSongs(6).then(setSongs).catch(() => setSongs([]))
  }, [])

  if (songs === null) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-16 rounded-xl border bg-muted/30 animate-pulse" />
        ))}
      </div>
    )
  }

  if (songs.length === 0) return null

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-sm font-medium text-muted-foreground">Discover</h2>
        <p className="text-xs text-muted-foreground/70">Songs others are learning — search to find yours</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {songs.map(song => (
          <SongCard key={song.id} song={song} />
        ))}
      </div>
    </div>
  )
}
