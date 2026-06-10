import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Trophy, Play, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { fetchTopSongs } from '@/lib/db'
import { useTranslation } from 'react-i18next'
import { toArtistSlug } from '@/lib/utils'
import type { Song } from '@/types'

const MEDAL = ['🥇', '🥈', '🥉']

export function LeaderboardPage() {
  const { t } = useTranslation()
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTopSongs(50).then(s => { setSongs(s); setLoading(false) })
  }, [])

  const baseUrl = import.meta.env.VITE_APP_URL ?? 'https://lyricslabs.com'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Helmet>
        <title>Top Songs | LyricsLabs</title>
        <meta name="description" content="The most played songs on LyricsLabs — practice lyrics with karaoke sync." />
        <link rel="canonical" href={`${baseUrl}/leaderboard`} />
        <meta property="og:title" content="Top Songs | LyricsLabs" />
        <meta property="og:url" content={`${baseUrl}/leaderboard`} />
      </Helmet>

      <div className="flex items-center gap-3">
        <Trophy className="h-6 w-6 text-primary shrink-0" />
        <h1 className="text-2xl font-bold">Top Songs</h1>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : songs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No plays recorded yet. Start listening!</p>
      ) : (
        <div className="divide-y rounded-lg border overflow-hidden">
          {songs.map((song, i) => {
            const hasSynced = song.lyrics.some(l => l.timestamp !== undefined)
            return (
              <Link
                key={song.id}
                to={`/songs/${song.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <span className="w-7 shrink-0 text-center text-sm font-semibold text-muted-foreground">
                  {i < 3 ? MEDAL[i] : i + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{song.title}</p>
                  <Link
                    to={`/artists/${toArtistSlug(song.artist)}`}
                    onClick={e => e.stopPropagation()}
                    className="text-xs text-muted-foreground hover:underline hover:text-foreground transition-colors"
                  >
                    {song.artist}
                  </Link>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="hidden sm:flex">
                    {t(`languages.${song.language}`, song.language)}
                  </Badge>
                  {hasSynced && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                  <span className="flex items-center gap-1 text-xs text-muted-foreground min-w-[3rem] justify-end">
                    <Play className="h-3 w-3" />
                    {(song.playCount ?? 0).toLocaleString()}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
