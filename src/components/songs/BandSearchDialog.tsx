import { useState } from 'react'
import { Loader2, Music2, CheckCircle2, FileText, Clock, MinusCircle } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { parseLRC, parsePlain } from '@/lib/fetchSongData'
import { saveSongRemote } from '@/lib/db'
import { searchArtistVideos, searchYouTubeVideo } from '@/lib/youtubeDataApi'
import type { Song } from '@/types'
import type { YTVideo } from '@/lib/youtubeDataApi'

// ─── lrclib types ──────────────────────────────────────────────────────────────

interface LrclibTrack {
  id: number
  trackName: string
  artistName: string
  albumName: string
  duration: number
  syncedLyrics: string | null
  plainLyrics: string | null
}

type FilterMode = 'synced' | 'plain' | 'all'

// ─── helpers ───────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function trackKey(artist: string, title: string): string {
  return `${artist.toLowerCase()}|||${title.toLowerCase()}`
}

async function searchLrclibArtist(artist: string): Promise<LrclibTrack[]> {
  const params = new URLSearchParams({ q: artist })
  const res = await fetch(`https://lrclib.net/api/search?${params}`, {
    headers: { 'Lrclib-Client': 'LyricLab/1.0' },
  })
  if (!res.ok) throw new Error(`lrclib search failed: ${res.status}`)
  const all = await res.json() as LrclibTrack[]
  const q = artist.toLowerCase()
  return all.filter(t => t.artistName.toLowerCase().includes(q) || q.includes(t.artistName.toLowerCase()))
}

// Title parsing for YouTube results (same logic as fetchYouTubeMetadata)
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
    return { artist: title.slice(0, dashIdx).trim(), songTitle: cleanTitle(title.slice(dashIdx + 3)) }
  }
  return {
    artist: channelTitle.replace(/vevo|official|music|channel/gi, '').trim(),
    songTitle: cleanTitle(title),
  }
}

// ─── sub-components ────────────────────────────────────────────────────────────

function LyricsBadge({ track }: { track: LrclibTrack }) {
  if (track.syncedLyrics) return (
    <Badge variant="outline" className="shrink-0 gap-1 text-xs text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30 dark:text-green-400">
      <CheckCircle2 className="h-3 w-3" /> Synced
    </Badge>
  )
  if (track.plainLyrics) return (
    <Badge variant="outline" className="shrink-0 gap-1 text-xs">
      <FileText className="h-3 w-3" /> Plain
    </Badge>
  )
  return (
    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
      <MinusCircle className="h-3 w-3" /> No lyrics
    </span>
  )
}

// ─── main component ────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingSongs: Song[]
  userId: string
  onImportDone: () => void
}

export function BandSearchDialog({ open, onOpenChange, existingSongs, userId, onImportDone }: Props) {
  const [artistQuery, setArtistQuery] = useState('')
  const [withLyrics, setWithLyrics] = useState(true)

  // lrclib results
  const [tracks, setTracks] = useState<LrclibTrack[]>([])
  const [filterMode, setFilterMode] = useState<FilterMode>('synced')

  // YouTube results (no-lyrics mode)
  const [ytVideos, setYtVideos] = useState<YTVideo[]>([])

  // shared
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null)
  const [importDone, setImportDone] = useState<number | null>(null)

  const existingKeys = new Set(existingSongs.map(s => trackKey(s.artist, s.title)))
  const existingYtIds = new Set(existingSongs.map(s => s.youtubeId).filter(Boolean))

  function resetResults() {
    setTracks([])
    setYtVideos([])
    setChecked(new Set())
    setFilterMode('synced')
    setSearchError(null)
  }

  function resetAndClose() {
    onOpenChange(false)
    setTimeout(() => {
      setArtistQuery('')
      setWithLyrics(true)
      setImporting(false)
      setImportProgress(null)
      setImportDone(null)
      resetResults()
    }, 250)
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  async function handleSearch() {
    if (!artistQuery.trim()) return
    setSearching(true)
    resetResults()
    try {
      if (withLyrics) {
        const results = await searchLrclibArtist(artistQuery.trim())
        const fresh = results.filter(t => !existingKeys.has(trackKey(t.artistName, t.trackName)))
        setTracks(fresh)
        if (fresh.length === 0) setSearchError('No new songs found — all results are already in your library.')
      } else {
        const videos = await searchArtistVideos(artistQuery.trim())
        const fresh = videos.filter(v => !existingYtIds.has(v.videoId))
        setYtVideos(fresh)
        if (fresh.length === 0) setSearchError('No new songs found — all results are already in your library.')
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  // ── Checkbox helpers ────────────────────────────────────────────────────────

  function toggleItem(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    const visible = withLyrics
      ? filteredTracks.map(t => String(t.id))
      : ytVideos.map(v => v.videoId)
    const allSelected = visible.length > 0 && visible.every(id => checked.has(id))
    setChecked(prev => {
      const next = new Set(prev)
      if (allSelected) visible.forEach(id => next.delete(id))
      else visible.forEach(id => next.add(id))
      return next
    })
  }

  // ── Derived display (lrclib) ────────────────────────────────────────────────

  const filteredTracks =
    filterMode === 'synced' ? tracks.filter(t => !!t.syncedLyrics) :
    filterMode === 'plain'  ? tracks.filter(t => !!t.plainLyrics && !t.syncedLyrics) :
    tracks

  const visibleIds = withLyrics
    ? filteredTracks.map(t => String(t.id))
    : ytVideos.map(v => v.videoId)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => checked.has(id))
  const selectedCount = checked.size

  function lrclibStatsText(): string {
    if (filterMode === 'synced') return `${filteredTracks.length} synced song${filteredTracks.length === 1 ? '' : 's'}`
    if (filterMode === 'plain') return `${filteredTracks.length} plain-lyrics song${filteredTracks.length === 1 ? '' : 's'}`
    const synced = tracks.filter(t => !!t.syncedLyrics).length
    const plain = tracks.filter(t => !!t.plainLyrics && !t.syncedLyrics).length
    const none = tracks.length - synced - plain
    const parts = [`${tracks.length} song${tracks.length === 1 ? '' : 's'}`]
    if (synced) parts.push(`${synced} synced`)
    if (plain) parts.push(`${plain} plain`)
    if (none) parts.push(`${none} no lyrics`)
    return parts.join(' · ')
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  async function handleImport() {
    const toImport = withLyrics
      ? filteredTracks.filter(t => checked.has(String(t.id)))
      : ytVideos.filter(v => checked.has(v.videoId))
    if (toImport.length === 0) return

    setImporting(true)
    setImportProgress({ done: 0, total: toImport.length })

    let done = 0
    if (withLyrics) {
      for (const track of toImport as LrclibTrack[]) {
        try {
          const lyrics = track.syncedLyrics
            ? parseLRC(track.syncedLyrics)
            : track.plainLyrics ? parsePlain(track.plainLyrics) : []
          const videoId = await searchYouTubeVideo(track.artistName, track.trackName)
          await saveSongRemote({
            id: crypto.randomUUID(),
            title: track.trackName,
            artist: track.artistName,
            language: 'en',
            youtubeUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '',
            youtubeId: videoId ?? '',
            lyrics,
            createdAt: Date.now(),
          }, userId)
        } catch { /* skip */ }
        done++
        setImportProgress({ done, total: toImport.length })
      }
    } else {
      for (const video of toImport as YTVideo[]) {
        try {
          const { artist, songTitle } = parseVideoTitle(video.title, video.channelTitle)
          await saveSongRemote({
            id: crypto.randomUUID(),
            title: songTitle || video.title,
            artist: artist || video.channelTitle,
            language: 'en',
            youtubeUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
            youtubeId: video.videoId,
            lyrics: [],
            createdAt: Date.now(),
          }, userId)
        } catch { /* skip */ }
        done++
        setImportProgress({ done, total: toImport.length })
      }
    }

    setImportDone(done)
    onImportDone()
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const hasResults = withLyrics ? tracks.length > 0 : ytVideos.length > 0

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music2 className="h-5 w-5" />
            {importing ? 'Importing songs…' : 'Import songs from a band'}
          </DialogTitle>
          <DialogDescription>
            {importing
              ? 'Saving to your library…'
              : withLyrics
                ? 'Search lrclib.net for songs by this artist and import with lyrics.'
                : 'Search YouTube for videos by this artist and import without lyrics.'}
          </DialogDescription>
        </DialogHeader>

        {/* ── Search + results ── */}
        {!importing && (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
            {/* Search bar */}
            <div className="flex gap-2">
              <Input
                placeholder="Artist or band name…"
                value={artistQuery}
                onChange={e => setArtistQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
                disabled={searching}
                autoFocus
              />
              <Button onClick={handleSearch} disabled={searching || !artistQuery.trim()}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
              </Button>
            </div>

            {/* With lyrics checkbox */}
            <label className="flex cursor-pointer items-center gap-2 self-start text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border accent-primary"
                checked={withLyrics}
                onChange={e => { setWithLyrics(e.target.checked); resetResults() }}
              />
              With lyrics
            </label>

            {searchError && <p className="text-sm text-destructive">{searchError}</p>}

            {/* ── lrclib results ── */}
            {withLyrics && tracks.length > 0 && (
              <>
                <div className="flex items-center gap-3">
                  <span className="flex-1 text-xs text-muted-foreground">{lrclibStatsText()}</span>
                  <Select value={filterMode} onValueChange={v => { setFilterMode(v as FilterMode); setChecked(new Set()) }}>
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="synced">Synced lyrics</SelectItem>
                      <SelectItem value="plain">Plain lyrics</SelectItem>
                      <SelectItem value="all">All songs</SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    className="whitespace-nowrap text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
                    onClick={toggleAll}
                  >
                    {allVisibleSelected ? 'Deselect all' : 'Select all'}
                  </button>
                </div>

                {filteredTracks.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No songs match this filter.</p>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                    {filteredTracks.map(track => (
                      <label key={track.id} className="flex cursor-pointer select-none items-center gap-3 rounded-lg border p-2.5 hover:bg-muted/40">
                        <input
                          type="checkbox"
                          className="h-4 w-4 shrink-0 rounded border-border accent-primary"
                          checked={checked.has(String(track.id))}
                          onChange={() => toggleItem(String(track.id))}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{track.trackName}</p>
                          <p className="truncate text-xs text-muted-foreground">{track.albumName || track.artistName}</p>
                        </div>
                        {track.duration > 0 && (
                          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />{formatDuration(track.duration)}
                          </span>
                        )}
                        <LyricsBadge track={track} />
                      </label>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── YouTube results ── */}
            {!withLyrics && ytVideos.length > 0 && (
              <>
                <div className="flex items-center gap-3">
                  <span className="flex-1 text-xs text-muted-foreground">
                    {ytVideos.length} video{ytVideos.length === 1 ? '' : 's'} found
                  </span>
                  <button
                    className="whitespace-nowrap text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
                    onClick={toggleAll}
                  >
                    {allVisibleSelected ? 'Deselect all' : 'Select all'}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                  {ytVideos.map(video => {
                    const { songTitle } = parseVideoTitle(video.title, video.channelTitle)
                    return (
                      <label key={video.videoId} className="flex cursor-pointer select-none items-center gap-3 rounded-lg border p-2.5 hover:bg-muted/40">
                        <input
                          type="checkbox"
                          className="h-4 w-4 shrink-0 rounded border-border accent-primary"
                          checked={checked.has(video.videoId)}
                          onChange={() => toggleItem(video.videoId)}
                        />
                        {video.thumbnail && (
                          <img src={video.thumbnail} alt="" className="h-9 w-12 shrink-0 rounded object-cover" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{songTitle || video.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{video.channelTitle}</p>
                        </div>
                        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                          <MinusCircle className="h-3 w-3" /> No lyrics
                        </span>
                      </label>
                    )
                  })}
                </div>
              </>
            )}

            {/* Footer — only when there are results */}
            {hasResults && (
              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
                <Button onClick={handleImport} disabled={selectedCount === 0}>
                  Import {selectedCount > 0 ? selectedCount : ''} song{selectedCount === 1 ? '' : 's'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Importing ── */}
        {importing && (
          <div className="flex flex-col items-center gap-4 py-8">
            {importDone === null ? (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {importProgress ? `Importing ${importProgress.done} / ${importProgress.total}…` : 'Starting…'}
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
