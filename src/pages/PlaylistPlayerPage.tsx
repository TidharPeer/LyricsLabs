import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Shuffle, Share2, SkipBack, SkipForward, Music2, ListMusic, Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { KaraokeView } from '@/components/player/KaraokeView'
import { useAuth } from '@/contexts/AuthContext'
import { fetchPlaylist, fetchPlaylistSongs } from '@/lib/db'
import { cn } from '@/lib/utils'
import type { Song, Playlist } from '@/types'

function shuffled(length: number): number[] {
  const arr = Array.from({ length }, (_, i) => i)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function PlaylistPlayerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, refreshStats } = useAuth()
  const [searchParams] = useSearchParams()

  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)

  // Position in the current playback order (0-based)
  const [pos, setPos] = useState(0)
  // null = in-order; array = shuffled indices into songs[]
  const [order, setOrder] = useState<number[] | null>(null)
  // true after any navigation so the next KaraokeView autoplays
  const autoplayRef = useRef(false)

  useEffect(() => {
    if (!id) return
    const rawStart = Number(searchParams.get('start'))
    const startIdx = Number.isFinite(rawStart) ? rawStart : 0
    const startShuffled = searchParams.get('shuffle') === '1'
    Promise.all([fetchPlaylist(id), fetchPlaylistSongs(id)]).then(([pl, sl]) => {
      setPlaylist(pl)
      setSongs(sl)
      const validStart = Math.max(0, Math.min(startIdx, Math.max(0, sl.length - 1)))
      if (startShuffled && sl.length > 0) {
        const newOrder = shuffled(sl.length)
        const ci = newOrder.indexOf(validStart)
        ;[newOrder[0], newOrder[ci]] = [newOrder[ci], newOrder[0]]
        setOrder(newOrder)
        setPos(0)
      } else {
        setPos(validStart)
      }
      setLoading(false)
    })
  }, [id, searchParams])

  // The resolved index into songs[] for the current position
  const currentIdx = order ? order[pos] : pos
  const currentSong: Song | null = songs[currentIdx] ?? null

  const canPrev = pos > 0
  const canNext = pos < songs.length - 1

  const goNext = useCallback(() => {
    autoplayRef.current = true
    setPos(p => Math.min(songs.length - 1, p + 1))
  }, [songs.length])

  const goPrev = useCallback(() => {
    autoplayRef.current = true
    setPos(p => Math.max(0, p - 1))
  }, [])

  function sharePlaylist() {
    const url = `${window.location.origin}/api/share?id=${id}`
    if (navigator.share) {
      navigator.share({ title: playlist?.name ?? 'Playlist', url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url).catch(() => {})
    }
  }

  function toggleShuffle() {
    if (order) {
      // Turn off — jump to the actual song index in ordered view
      setPos(currentIdx)
      setOrder(null)
    } else {
      // Turn on — build a shuffled order, current song goes first
      const newOrder = shuffled(songs.length)
      const ci = newOrder.indexOf(currentIdx)
      // swap current song to position 0
      ;[newOrder[0], newOrder[ci]] = [newOrder[ci], newOrder[0]]
      setOrder(newOrder)
      setPos(0)
    }
  }

  // Ordered display list (what appears in the queue panel)
  const queueOrder = useMemo(
    () => order ?? Array.from({ length: songs.length }, (_, i) => i),
    [order, songs.length]
  )

  const handleStarEarned = useCallback(() => refreshStats(), [refreshStats])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (!playlist || songs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <ListMusic className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">
          {!playlist ? 'Playlist not found.' : 'This playlist has no songs yet.'}
        </p>
        <Button variant="outline" onClick={() => navigate('/playlists')}>
          <ArrowLeft className="h-4 w-4" />
          Back to Playlists
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/playlists')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{t('playlist.playlists')}</p>
          <h1 className="text-lg font-semibold truncate">{playlist.name}</h1>
        </div>
        {currentSong && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => navigate(`/songs/${currentSong.id}`)}
            title="Go to song"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="hidden sm:inline">Go to song</span>
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={sharePlaylist}
          title="Share playlist"
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Share</span>
        </Button>
        <Button
          variant={order ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={toggleShuffle}
          title={order ? 'Shuffle on — click to turn off' : 'Shuffle off — click to turn on'}
        >
          <Shuffle className="h-4 w-4" />
          <span className="hidden sm:inline">Shuffle</span>
        </Button>
      </div>

      {/* ── Current song info ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold truncate">{currentSong?.title}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-muted-foreground text-sm truncate">{currentSong?.artist}</span>
            {currentSong?.language && (
              <Badge variant="secondary" className="text-xs shrink-0">
                {t(`languages.${currentSong.language}`, currentSong.language)}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="icon" onClick={goPrev} disabled={!canPrev}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums w-14 text-center">
            {pos + 1} / {songs.length}
          </span>
          <Button variant="outline" size="icon" onClick={goNext} disabled={!canNext}>
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Karaoke view — key forces full remount on song change ────────────── */}
      {currentSong && (
        <KaraokeView
          key={currentSong.id}
          song={currentSong}
          userId={user?.id}
          onStarEarned={handleStarEarned}
          onEnded={canNext ? goNext : undefined}
          autoplay={autoplayRef.current}
        />
      )}

      {/* ── Queue ────────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
          <p className="text-sm font-medium">Queue</p>
          <p className="text-xs text-muted-foreground">
            {songs.length} {songs.length === 1 ? 'song' : 'songs'}
            {order && ' · shuffled'}
          </p>
        </div>
        <div className="divide-y max-h-72 overflow-y-auto">
          {queueOrder.map((songIdx, queuePos) => {
            const song = songs[songIdx]
            const isActive = queuePos === pos
            return (
              <div
                key={song.id}
                role="button"
                tabIndex={0}
                onClick={() => { autoplayRef.current = true; setPos(queuePos) }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { autoplayRef.current = true; setPos(queuePos) } }}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent cursor-pointer group/queue',
                  isActive && 'bg-primary/5'
                )}
              >
                <div className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                  isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>
                  {isActive ? <Music2 className="h-3.5 w-3.5" /> : queuePos + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm truncate', isActive && 'font-semibold text-primary')}>
                    {song.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                </div>
                {song.lyrics.some(l => l.timestamp !== undefined) && (
                  <Badge variant="outline" className="hidden sm:flex text-xs shrink-0 text-green-600 border-green-300">
                    Synced
                  </Badge>
                )}
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/songs/${song.id}`) }}
                  className="flex sm:hidden group-hover/queue:flex items-center justify-center rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors shrink-0"
                  title="Go to this song"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
