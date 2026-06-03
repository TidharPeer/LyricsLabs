import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ListMusic, Play } from 'lucide-react'
import { SongCard } from '@/components/songs/SongCard'
import { fetchSongsByIds, fetchPlaylist } from '@/lib/db'
import { getRecentSongIds, getRecentPlaylistId } from '@/lib/storage'
import type { Song, Playlist } from '@/types'

interface Props {
  userId: string
}

export function RecentlyPlayed({ userId }: Props) {
  const [songs, setSongs] = useState<Song[] | null>(null)
  const [playlist, setPlaylist] = useState<Playlist | null | undefined>(undefined)

  useEffect(() => {
    const songIds = getRecentSongIds(userId)
    const playlistId = getRecentPlaylistId(userId)

    Promise.all([
      songIds.length > 0 ? fetchSongsByIds(songIds) : Promise.resolve([]),
      playlistId ? fetchPlaylist(playlistId).catch(() => null) : Promise.resolve(null),
    ]).then(([s, pl]) => {
      setSongs(s)
      setPlaylist(pl)
    })
  }, [userId])

  // Still loading
  if (songs === null || playlist === undefined) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-xl border bg-muted/30 animate-pulse" />
        ))}
      </div>
    )
  }

  // Nothing tracked yet — render nothing (DiscoverSection is always shown below)
  if (songs.length === 0 && !playlist) return null

  return (
    <div className="space-y-5">
      {playlist && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Last Playlist</h2>
          <Link
            to={`/playlists/${playlist.id}/play`}
            className="flex items-center justify-between rounded-xl border p-4 hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 shrink-0">
                <ListMusic className="h-5 w-5 text-indigo-500 group-hover:hidden" />
                <Play className="h-5 w-5 text-indigo-500 hidden group-hover:block" />
              </div>
              <div>
                <p className="font-medium leading-tight">{playlist.name}</p>
                {playlist.songCount != null && (
                  <p className="text-xs text-muted-foreground">{playlist.songCount} songs</p>
                )}
              </div>
            </div>
            <span className="flex items-center gap-1.5 text-sm font-medium text-primary opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
              <Play className="h-3.5 w-3.5" />
              Continue
            </span>
          </Link>
        </div>
      )}

      {songs.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Recently Played</h2>
          <div className="grid gap-2">
            {songs.map(song => (
              <SongCard key={song.id} song={song} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
