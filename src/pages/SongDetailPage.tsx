import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft, Edit, Clock, Gamepad2, Share2, Music2, CheckCircle2, ListMusic } from 'lucide-react'
import { fetchSong, fetchSongs } from '@/lib/db'
import { addRecentSong } from '@/lib/storage'
import { lyricsDir } from '@/lib/rtl'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { KaraokeView } from '@/components/player/KaraokeView'
import type { Song } from '@/types'

export function SongDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const fromPlaylist = (location.state as { fromPlaylist?: { id: string; name: string } } | null)?.fromPlaylist
  const { user, refreshStats } = useAuth()

  const [song, setSong] = useState<Song | null>(null)
  const [loading, setLoading] = useState(true)
  const [artistSongs, setArtistSongs] = useState<Song[]>([])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  useEffect(() => {
    if (!id) { setLoading(false); return }
    fetchSong(id).then(s => {
      setSong(s ?? null)
      setLoading(false)
      if (s && user) addRecentSong(user.id, s.id)
      if (s?.artist) {
        fetchSongs().then(all => {
          const norm = s.artist.toLowerCase()
          setArtistSongs(
            all
              .filter(a => a.id !== s.id && a.artist.toLowerCase() === norm)
              .sort((a, b) => a.title.localeCompare(b.title))
          )
        }).catch(() => {})
      }
    })
  }, [id])

  const handleStarEarned = useCallback(() => { refreshStats() }, [refreshStats])

  if (loading) {
    return <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
  }

  if (!song) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">{t('common.notFound')}</p>
        <Button className="mt-4" onClick={() => navigate('/')}>
          {t('common.back')}
        </Button>
      </div>
    )
  }

  const hasTimestamps = song.lyrics.some((l) => l.timestamp !== undefined)

  const baseUrl = import.meta.env.VITE_APP_URL ?? 'https://lyricslabs.com'
  const canonicalUrl = `${baseUrl}/songs/${song.id}`
  const pageTitle = `${song.title} — ${song.artist} | LyricsLabs`
  const pageDesc = `Learn and practice the lyrics to "${song.title}" by ${song.artist}${hasTimestamps ? ' with karaoke-style sync' : ''} on LyricsLabs.`

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="music.song" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:url" content={canonicalUrl} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDesc} />
      </Helmet>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0 mt-0.5" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold leading-snug">{song.title}</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
              <span className="text-sm text-muted-foreground">{song.artist}</span>
              <Badge variant="secondary">{t(`languages.${song.language}`, song.language)}</Badge>
              <span className="text-xs text-muted-foreground">
                {t('song.lines', { count: song.lyrics.length })}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const shareUrl = `${window.location.origin}/api/song?id=${song.id}`
              if (navigator.share) {
                navigator.share({ title: `${song.title} — ${song.artist}`, url: shareUrl }).catch(() => {})
              } else {
                navigator.clipboard.writeText(shareUrl).catch(() => {})
              }
            }}
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Share</span>
          </Button>
          {user && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/songs/${song.id}/edit`}>
                <Edit className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('common.edit')}</span>
              </Link>
            </Button>
          )}
          {user && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/songs/${song.id}/timestamps`}>
                <Clock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('songDetail.editTimestamps')}</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue={hasTimestamps ? 'karaoke' : 'lyrics'}>
        <TabsList>
          <TabsTrigger value="karaoke">{t('songDetail.karaoke')}</TabsTrigger>
          <TabsTrigger value="lyrics">{t('songDetail.lyrics')}</TabsTrigger>
          <TabsTrigger value="practice">{t('songDetail.practice')}</TabsTrigger>
        </TabsList>

        <TabsContent value="karaoke" className="mt-4 space-y-6">
          <KaraokeView song={song} userId={user?.id} onStarEarned={handleStarEarned} />

          {fromPlaylist && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Your playlist</h3>
              <Link
                to={`/playlists/${fromPlaylist.id}/play`}
                state={{ fromPlaylist }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <ListMusic className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1 min-w-0 text-sm font-medium truncate">{fromPlaylist.name}</span>
                <ArrowLeft className="h-4 w-4 text-muted-foreground shrink-0 rotate-180" />
              </Link>
            </div>
          )}

          {artistSongs.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">
                More by {song.artist}
              </h3>
              <div className="divide-y rounded-lg border overflow-hidden">
                {artistSongs.map(s => (
                  <Link
                    key={s.id}
                    to={`/songs/${s.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <Music2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 min-w-0 text-sm font-medium truncate">{s.title}</span>
                    {s.lyrics.some(l => l.timestamp !== undefined) && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="lyrics" className="mt-4 space-y-3">
          {/* Timestamps CTA — add when none exist, edit when they do */}
          {song.lyrics.length > 0 && user && (
            <Button variant="outline" asChild className="w-full sm:w-auto gap-1.5">
              <Link to={`/songs/${song.id}/timestamps`}>
                <Clock className="h-4 w-4" />
                {hasTimestamps ? 'Edit Timestamps' : 'Add Timestamps for Karaoke'}
              </Link>
            </Button>
          )}
          <div className="rounded-lg border p-4 space-y-0.5 max-h-[500px] overflow-y-auto" dir={lyricsDir(song.language)}>
            {song.lyrics.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <p className="text-muted-foreground text-sm">{t('song.noLyrics')}</p>
                {user && (
                  <Button asChild>
                    <Link to={`/songs/${song.id}/edit`}>Add Lyrics</Link>
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2 pb-2 border-b text-xs text-muted-foreground">
                  <span>{song.lyrics.length} lines</span>
                </div>
                {song.lyrics.map((line, i) => (
                  <div key={line.id} className="flex items-baseline gap-3 py-0.5">
                    <span className="text-xs text-muted-foreground w-8 shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-sm leading-relaxed text-foreground">{line.text}</p>
                  </div>
                ))}
              </>
            )}
          </div>

        </TabsContent>

        <TabsContent value="practice" className="mt-4">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Choose a practice mode:</p>
            <Separator />
            {[
              { mode: 'memory-burst', title: t('game.memoryBurst'), desc: t('game.memoryBurstDesc') },
              { mode: 'fill-blank', title: t('game.fillBlank'), desc: t('game.fillBlankDesc') },
              { mode: 'fadeout', title: t('game.fadeout'), desc: t('game.fadeoutDesc') },
              { mode: 'line-completion', title: t('game.lineCompletion'), desc: t('game.lineCompletionDesc') },
              { mode: 'back-chain', title: t('game.backChain'), desc: t('game.backChainDesc') },
            ].map(({ mode, title, desc }) => (
              <div
                key={mode}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
                <Button asChild size="sm">
                  <Link to={`/songs/${song.id}/game/${mode}`}>
                    <Gamepad2 className="h-3.5 w-3.5" />
                    {t('game.start')}
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
