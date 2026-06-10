import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SongCard } from '@/components/songs/SongCard'
import { fetchSongsByArtist } from '@/lib/db'
import { useAuth } from '@/contexts/AuthContext'
import type { Song } from '@/types'

export function ArtistPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) { setLoading(false); return }
    fetchSongsByArtist(slug).then(s => { setSongs(s); setLoading(false) })
  }, [slug])

  if (loading) {
    return <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
  }

  if (!songs.length) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">No songs found for this artist.</p>
        <Button className="mt-4" onClick={() => navigate('/')}>Back to Home</Button>
      </div>
    )
  }

  const artistName = songs[0].artist
  const syncedCount = songs.filter(s => s.lyrics.some(l => l.timestamp !== undefined)).length
  const baseUrl = import.meta.env.VITE_APP_URL ?? 'https://lyricslabs.com'
  const canonicalUrl = `${baseUrl}/artists/${slug}`
  const pageTitle = `${artistName} — Songs & Lyrics | LyricsLabs`
  const pageDesc = `Practice lyrics from ${artistName} on LyricsLabs. ${songs.length} song${songs.length !== 1 ? 's' : ''}${syncedCount > 0 ? `, ${syncedCount} with karaoke sync` : ''}.`

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:url" content={canonicalUrl} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDesc} />
      </Helmet>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{artistName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">{songs.length} song{songs.length !== 1 ? 's' : ''}</Badge>
            {syncedCount > 0 && (
              <Badge variant="outline" className="text-green-600 border-green-500/40">
                {syncedCount} karaoke synced
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {songs.map(song => (
          <SongCard key={song.id} song={song} userId={user?.id} />
        ))}
      </div>
    </div>
  )
}
