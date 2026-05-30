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
import { searchYouTubeVideo } from '@/lib/youtubeDataApi'
import type { Song } from '@/types'

// ─── types ─────────────────────────────────────────────────────────────────────

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

// ─── lyrics badge ──────────────────────────────────────────────────────────────

function LyricsBadge({ track }: { track: LrclibTrack }) {
  if (track.syncedLyrics) return (
    <Badge
      variant="outline"
      className="shrink-0 gap-1 text-xs text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30 dark:text-green-400"
    >
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

// ─── component ─────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingSongs: Song[]
  userId: string
  onImportDone: () => void
}

export function BandSearchDialog({ open, onOpenChange, existingSongs, userId, onImportDone }: Props) {
  const [artistQuery, setArtistQuery] = useState('')
  const [tracks, setTracks] = useState<LrclibTrack[]>([])
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [filterMode, setFilterMode] = useState<FilterMode>('synced')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null)
  const [importDone, setImportDone] = useState<number | null>(null)

  const existingKeys = new Set(existingSongs.map(s => trackKey(s.artist, s.title)))

  function resetAndClose() {
    onOpenChange(false)
    setTimeout(() => {
      setArtistQuery('')
      setTracks([])
      setChecked(new Set())
      setFilterMode('synced')
      setSearchError(null)
      setImporting(false)
      setImportProgress(null)
      setImportDone(null)
    }, 250)
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  async function handleSearch() {
    if (!artistQuery.trim()) return
    setSearching(true)
    setSearchError(null)
    setTracks([])
    setChecked(new Set())
    setFilterMode('synced')
    try {
      const results = await searchLrclibArtist(artistQuery.trim())
      const fresh = results.filter(t => !existingKeys.has(trackKey(t.artistName, t.trackName)))
      setTracks(fresh)
      if (fresh.length === 0) setSearchError('No new songs found — all results are already in your library.')
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  // ── Checkbox helpers ────────────────────────────────────────────────────────

  function toggleTrack(id: number) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    const visible = filteredTracks.map(t => t.id)
    const allSelected = visible.length > 0 && visible.every(id => checked.has(id))
    setChecked(prev => {
      const next = new Set(prev)
      if (allSelected) {
        visible.forEach(id => next.delete(id))
      } else {
        visible.forEach(id => next.add(id))
      }
      return next
    })
  }

  // ── Derived display ─────────────────────────────────────────────────────────

  const filteredTracks =
    filterMode === 'synced' ? tracks.filter(t => !!t.syncedLyrics) :
    filterMode === 'plain'  ? tracks.filter(t => !!t.plainLyrics && !t.syncedLyrics) :
    tracks

  const allVisibleSelected = filteredTracks.length > 0 && filteredTracks.every(t => checked.has(t.id))
  const selectedCount = checked.size

  function statsText(): string {
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
    const toImport = filteredTracks.filter(t => checked.has(t.id))
    if (toImport.length === 0) return

    setImporting(true)
    setImportProgress({ done: 0, total: toImport.length })

    let done = 0
    for (const track of toImport) {
      try {
        const lyrics = track.syncedLyrics
          ? parseLRC(track.syncedLyrics)
          : track.plainLyrics
            ? parsePlain(track.plainLyrics)
            : []

        const videoId = await searchYouTubeVideo(track.artistName, track.trackName)

        await saveSongRemote(
          {
            id: crypto.randomUUID(),
            title: track.trackName,
            artist: track.artistName,
            language: 'en',
            youtubeUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '',
            youtubeId: videoId ?? '',
            lyrics,
            createdAt: Date.now(),
          },
          userId,
        )
      } catch {
        // skip individual failures silently
      }
      done++
      setImportProgress({ done, total: toImport.length })
    }

    setImportDone(done)
    onImportDone()
  }

  // ── Render ──────────────────────────────────────────────────────────────────

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
              : 'Search an artist on lrclib.net and choose songs to import.'}
          </DialogDescription>
        </DialogHeader>

        {/* ── Search + results ── */}
        {!importing && (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
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

            {searchError && <p className="text-sm text-destructive">{searchError}</p>}

            {tracks.length > 0 && (
              <>
                {/* Stats + filter dropdown + select-all */}
                <div className="flex items-center gap-3">
                  <span className="flex-1 text-xs text-muted-foreground">{statsText()}</span>
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
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors whitespace-nowrap"
                    onClick={toggleAll}
                  >
                    {allVisibleSelected ? 'Deselect all' : 'Select all'}
                  </button>
                </div>

                {filteredTracks.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No songs match this filter.
                  </p>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                    {filteredTracks.map(track => (
                      <label
                        key={track.id}
                        className="flex cursor-pointer select-none items-center gap-3 rounded-lg border p-2.5 hover:bg-muted/40"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 shrink-0 rounded border-border accent-primary"
                          checked={checked.has(track.id)}
                          onChange={() => toggleTrack(track.id)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{track.trackName}</p>
                          <p className="truncate text-xs text-muted-foreground">{track.albumName || track.artistName}</p>
                        </div>
                        {track.duration > 0 && (
                          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDuration(track.duration)}
                          </span>
                        )}
                        <LyricsBadge track={track} />
                      </label>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
                  <Button onClick={handleImport} disabled={selectedCount === 0}>
                    Import {selectedCount > 0 ? selectedCount : ''} song{selectedCount === 1 ? '' : 's'}
                  </Button>
                </div>
              </>
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
