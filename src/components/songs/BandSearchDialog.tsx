import { useState } from 'react'
import { Loader2, Music2, CheckCircle2, FileText, Clock } from 'lucide-react'
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
import { parseLRC, parsePlain } from '@/lib/fetchSongData'
import { saveSongRemote } from '@/lib/db'
import { searchYouTubeVideo } from '@/lib/youtubeDataApi'
import type { Song } from '@/types'

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
  // Filter to tracks whose artist name matches the query (lrclib q= searches all fields)
  const q = artist.toLowerCase()
  return all.filter(t => t.artistName.toLowerCase().includes(q) || q.includes(t.artistName.toLowerCase()))
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
  const [showAll, setShowAll] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null)
  const [importDone, setImportDone] = useState<number | null>(null)

  // Build dedup set from existing songs (by title+artist)
  const existingKeys = new Set(existingSongs.map(s => trackKey(s.artist, s.title)))

  function resetAndClose() {
    onOpenChange(false)
    setTimeout(() => {
      setArtistQuery('')
      setTracks([])
      setChecked(new Set())
      setShowAll(false)
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
    setShowAll(false)
    try {
      const results = await searchLrclibArtist(artistQuery.trim())
      // Filter out already-saved songs
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
    const allSelected = visible.every(id => checked.has(id))
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

  // ── Derived display list ────────────────────────────────────────────────────

  const syncedTracks = tracks.filter(t => t.syncedLyrics)
  const filteredTracks = showAll ? tracks : syncedTracks

  const allVisibleSelected = filteredTracks.length > 0 && filteredTracks.every(t => checked.has(t.id))
  const selectedCount = checked.size

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

        // Try to find a YouTube video for the song (optional)
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
              ? `Saving to your library…`
              : 'Search an artist on lrclib.net and choose songs with synced lyrics to import.'}
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

            {searchError && <p className="text-sm text-destructive">{searchError}</p>}

            {/* Results */}
            {filteredTracks.length > 0 && (
              <>
                {/* Stats + filter toggle */}
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {showAll
                      ? `${tracks.length} songs found`
                      : `${syncedTracks.length} synced songs found`}
                    {showAll && tracks.length !== syncedTracks.length && (
                      <> · {syncedTracks.length} synced</>
                    )}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      className="underline underline-offset-2 hover:text-foreground transition-colors"
                      onClick={() => setShowAll(v => !v)}
                    >
                      {showAll ? 'Synced only' : 'Show all'}
                    </button>
                    <button
                      className="underline underline-offset-2 hover:text-foreground transition-colors"
                      onClick={toggleAll}
                    >
                      {allVisibleSelected ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                </div>

                {/* Song list */}
                <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                  {filteredTracks.map(track => {
                    const isSynced = !!track.syncedLyrics
                    return (
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
                        {isSynced ? (
                          <Badge
                            variant="outline"
                            className="shrink-0 gap-1 text-xs text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30 dark:text-green-400"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Synced
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="shrink-0 gap-1 text-xs">
                            <FileText className="h-3 w-3" /> Plain
                          </Badge>
                        )}
                      </label>
                    )
                  })}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-sm text-muted-foreground">
                    {selectedCount} selected
                  </span>
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
