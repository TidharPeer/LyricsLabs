import { useState } from 'react'
import { Loader2, Music2, CheckCircle2, XCircle, FileText } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { fetchLyrics, fetchYouTubeMetadata } from '@/lib/fetchSongData'
import { saveSongRemote } from '@/lib/db'
import { searchChannels, getUploadsPlaylistId, getPlaylistVideos } from '@/lib/youtubeDataApi'
import type { Song } from '@/types'
import type { YTChannel, YTVideo } from '@/lib/youtubeDataApi'
import type { FetchedLyrics } from '@/lib/fetchSongData'

// ─── Types ─────────────────────────────────────────────────────────────────────

type LyricsStatus = 'loading' | 'synced' | 'plain' | 'none'
type Phase = 'search' | 'songs' | 'importing'

interface VideoItem {
  video: YTVideo
  artist: string
  songTitle: string
  lyricsStatus: LyricsStatus
  lyrics: FetchedLyrics | null
  checked: boolean
}

// ─── Title helpers (mirrors logic in fetchSongData.ts) ──────────────────────────

const JUNK_RE = [
  /\s*[\(\[][^\)\]]*(?:official|audio|video|lyric(?:s)?|hd|4k|remaster(?:ed)?|mv|clip|visualizer|live|vevo|explicit|clean|version|ver\.|edit|ft\.|feat\.[^\)\]]*)[\)\]]/gi,
  /\s*\|\s*(?:official|audio|video|music\s*video).*$/gi,
  /\s+-\s+(?:official|audio|video|music)(?:\s*video|\s*audio)?$/gi,
]
function cleanTitle(raw: string): string {
  let s = raw
  for (const re of JUNK_RE) s = s.replace(re, '')
  return s.trim()
}
function parseVideoTitle(title: string, channelTitle: string): { artist: string; songTitle: string } {
  const dashIdx = title.indexOf(' - ')
  if (dashIdx > 0) {
    return {
      artist: title.slice(0, dashIdx).trim(),
      songTitle: cleanTitle(title.slice(dashIdx + 3)),
    }
  }
  return {
    artist: channelTitle.replace(/vevo|official|music|channel/gi, '').trim(),
    songTitle: cleanTitle(title),
  }
}

// ─── Lyrics status indicator ───────────────────────────────────────────────────

function LyricsStatusBadge({ status }: { status: LyricsStatus }) {
  if (status === 'loading') return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
      <Loader2 className="h-3 w-3 animate-spin" /> Fetching…
    </span>
  )
  if (status === 'synced') return (
    <Badge
      variant="outline"
      className="gap-1 text-xs text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30 dark:text-green-400 whitespace-nowrap"
    >
      <CheckCircle2 className="h-3 w-3" /> Synced
    </Badge>
  )
  if (status === 'plain') return (
    <Badge variant="outline" className="gap-1 text-xs whitespace-nowrap">
      <FileText className="h-3 w-3" /> Plain
    </Badge>
  )
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
      <XCircle className="h-3 w-3" /> No lyrics
    </span>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingSongs: Song[]
  userId: string
  onImportDone: () => void
}

export function BandSearchDialog({ open, onOpenChange, existingSongs, userId, onImportDone }: Props) {
  const [phase, setPhase] = useState<Phase>('search')
  const [bandQuery, setBandQuery] = useState('')
  const [channels, setChannels] = useState<YTChannel[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<YTChannel | null>(null)
  const [videoItems, setVideoItems] = useState<VideoItem[]>([])
  const [videosLoading, setVideosLoading] = useState(false)
  const [videosError, setVideosError] = useState<string | null>(null)
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null)
  const [importDone, setImportDone] = useState<number | null>(null)

  const existingIds = new Set(existingSongs.map(s => s.youtubeId))

  function resetAndClose() {
    onOpenChange(false)
    setTimeout(() => {
      setPhase('search')
      setBandQuery('')
      setChannels([])
      setSearchError(null)
      setSelectedChannel(null)
      setVideoItems([])
      setVideosError(null)
      setImportProgress(null)
      setImportDone(null)
    }, 250)
  }

  // ── Phase 1: Search channels ──────────────────────────────────────────────────

  async function handleSearch() {
    if (!bandQuery.trim()) return
    setSearchLoading(true)
    setSearchError(null)
    setChannels([])
    try {
      const results = await searchChannels(bandQuery.trim())
      setChannels(results)
      if (results.length === 0) setSearchError('No channels found — try a different spelling.')
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearchLoading(false)
    }
  }

  // ── Phase 2: Load songs from channel ─────────────────────────────────────────

  async function handleSelectChannel(channel: YTChannel) {
    setSelectedChannel(channel)
    setPhase('songs')
    setVideosLoading(true)
    setVideosError(null)
    setVideoItems([])

    let items: VideoItem[] = []
    try {
      const playlistId = await getUploadsPlaylistId(channel.id)
      if (!playlistId) throw new Error('Could not find uploads playlist for this channel.')

      const videos = await getPlaylistVideos(playlistId, 100)
      items = videos
        .filter((v: YTVideo) => !existingIds.has(v.videoId))
        .map((v: YTVideo) => {
          const { artist, songTitle } = parseVideoTitle(v.title, v.channelTitle)
          return { video: v, artist, songTitle, lyricsStatus: 'loading' as LyricsStatus, lyrics: null, checked: false }
        })

      setVideoItems(items)
    } catch (err) {
      setVideosError(err instanceof Error ? err.message : 'Failed to load songs')
      setVideosLoading(false)
      return
    }
    setVideosLoading(false)

    // Fetch lyrics for all videos in parallel, update each result as it arrives
    const promises = items.map((item, i) =>
      fetchLyrics(item.artist, item.songTitle).then(result => {
        setVideoItems(prev =>
          prev.map((v, j) =>
            j !== i ? v : {
              ...v,
              lyricsStatus: result ? (result.synced ? 'synced' : 'plain') : 'none',
              lyrics: result,
            }
          )
        )
      }).catch(() => {
        setVideoItems(prev =>
          prev.map((v, j) => j !== i ? v : { ...v, lyricsStatus: 'none' })
        )
      })
    )
    await Promise.allSettled(promises)
  }

  // ── Checkbox helpers ──────────────────────────────────────────────────────────

  function toggleItem(videoId: string) {
    setVideoItems(prev =>
      prev.map(v => v.video.videoId === videoId ? { ...v, checked: !v.checked } : v)
    )
  }

  function toggleAll() {
    const allChecked = videoItems.every(v => v.checked)
    setVideoItems(prev => prev.map(v => ({ ...v, checked: !allChecked })))
  }

  // ── Phase 3: Import selected songs ───────────────────────────────────────────

  async function handleImport() {
    const toImport = videoItems.filter(v => v.checked)
    if (toImport.length === 0) return

    setPhase('importing')
    setImportProgress({ done: 0, total: toImport.length })

    let done = 0
    for (const item of toImport) {
      try {
        const meta = await fetchYouTubeMetadata(item.video.videoId)
        await saveSongRemote(
          {
            id: crypto.randomUUID(),
            title: meta?.title ?? item.songTitle,
            artist: meta?.artist ?? item.artist,
            language: meta?.language ?? 'en',
            youtubeUrl: `https://www.youtube.com/watch?v=${item.video.videoId}`,
            youtubeId: item.video.videoId,
            lyrics: item.lyrics?.lines ?? [],
            createdAt: Date.now(),
          },
          userId,
        )
      } catch {
        // skip individual failures
      }
      done++
      setImportProgress({ done, total: toImport.length })
    }

    setImportDone(done)
    onImportDone()
  }

  const selectedCount = videoItems.filter(v => v.checked).length

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music2 className="h-5 w-5" />
            {phase === 'importing' ? 'Importing songs…' : 'Import songs from a band'}
          </DialogTitle>
          <DialogDescription>
            {phase === 'search' && 'Search for a band or artist, then choose songs from their YouTube channel.'}
            {phase === 'songs' && selectedChannel && `Songs from ${selectedChannel.name}. Already-saved songs are hidden.`}
            {phase === 'importing' && `Saving to your library…`}
          </DialogDescription>
        </DialogHeader>

        {/* ── Search ── */}
        {phase === 'search' && (
          <div className="flex min-h-0 flex-col gap-4">
            <div className="flex gap-2">
              <Input
                placeholder="Band or artist name…"
                value={bandQuery}
                onChange={e => setBandQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
                disabled={searchLoading}
                autoFocus
              />
              <Button onClick={handleSearch} disabled={searchLoading || !bandQuery.trim()}>
                {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
              </Button>
            </div>

            {searchError && <p className="text-sm text-destructive">{searchError}</p>}

            {channels.length > 0 && (
              <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
                <p className="text-xs text-muted-foreground">Select the correct channel:</p>
                {channels.map(ch => (
                  <div
                    key={ch.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/50"
                    onClick={() => handleSelectChannel(ch)}
                  >
                    {ch.thumbnail && (
                      <img src={ch.thumbnail} alt={ch.name} className="h-10 w-10 shrink-0 rounded-full object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{ch.name}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">{ch.description}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); handleSelectChannel(ch) }}>
                      Select
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Songs list ── */}
        {phase === 'songs' && (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
            {videosLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading songs…
              </div>
            )}

            {videosError && <p className="text-sm text-destructive">{videosError}</p>}

            {!videosLoading && !videosError && videoItems.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                All songs from this channel are already in your library.
              </p>
            )}

            {!videosLoading && videoItems.length > 0 && (
              <>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{videoItems.length} song{videoItems.length === 1 ? '' : 's'} available</span>
                  <button
                    className="underline underline-offset-2 hover:text-foreground transition-colors"
                    onClick={toggleAll}
                  >
                    {videoItems.every(v => v.checked) ? 'Deselect all' : 'Select all'}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                  {videoItems.map(item => (
                    <label
                      key={item.video.videoId}
                      className="flex cursor-pointer select-none items-center gap-3 rounded-lg border p-2.5 hover:bg-muted/40"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 rounded border-border accent-primary"
                        checked={item.checked}
                        onChange={() => toggleItem(item.video.videoId)}
                      />
                      {item.video.thumbnail && (
                        <img
                          src={item.video.thumbnail}
                          alt=""
                          className="h-9 w-12 shrink-0 rounded object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.songTitle || item.video.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.artist}</p>
                      </div>
                      <LyricsStatusBadge status={item.lyricsStatus} />
                    </label>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-sm text-muted-foreground">
                    {selectedCount} selected
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setPhase('search')}>Back</Button>
                    <Button onClick={handleImport} disabled={selectedCount === 0}>
                      Import {selectedCount > 0 ? selectedCount : ''} song{selectedCount === 1 ? '' : 's'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Importing ── */}
        {phase === 'importing' && (
          <div className="flex flex-col items-center gap-4 py-8">
            {importDone === null ? (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {importProgress
                    ? `Importing ${importProgress.done} / ${importProgress.total}…`
                    : 'Starting…'}
                </p>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-10 w-10 text-green-500" />
                <p className="text-base font-medium">
                  {importDone} song{importDone === 1 ? '' : 's'} added to your library!
                </p>
                <Button onClick={resetAndClose}>Done</Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
