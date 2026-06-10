import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Loader2, CheckCircle2, AlertCircle, ListMusic,
  MapPin, Calendar, List, Mic2, Search, Music2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { fetchSongs, saveSongRemote, addStars, createPlaylist, addSongToPlaylist } from '@/lib/db'
import { fetchLyrics } from '@/lib/fetchSongData'
import { searchYouTubeVideo, searchYouTubeVideoIds } from '@/lib/youtubeDataApi'
import { useAuth } from '@/contexts/AuthContext'
import {
  searchSetlistArtists,
  getArtistSetlists,
  extractSetlistSongs,
  formatSetlistDate,
  type SetlistArtist,
  type Setlist,
  type SetlistSong,
} from '@/lib/setlistFmApi'
import type { Song } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'search' | 'concerts' | 'songs'
type ImportStatus = 'in-library' | 'not-imported' | 'importing' | 'imported' | 'error'

interface SongImportState {
  song: SetlistSong
  status: ImportStatus
  songId?: string
  error?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normStr(s: string) {
  return s.toLowerCase().trim()
}

function findInLibrary(library: Song[], artist: string, title: string): Song | undefined {
  const nt = normStr(title)
  const na = normStr(artist)
  return library.find(s => normStr(s.title) === nt && normStr(s.artist) === na)
}

function buildStates(songs: SetlistSong[], library: Song[], artistName: string): SongImportState[] {
  return songs.map(song => {
    const existing = findInLibrary(library, artistName, song.name)
    return { song, status: existing ? 'in-library' : 'not-imported', songId: existing?.id }
  })
}

function defaultChecked(states: SongImportState[]): Set<number> {
  return new Set(states.flatMap((s, i) => s.status === 'not-imported' ? [i] : []))
}

// Background YouTube-ID enrichment: for each unmatched setlist song, search YouTube
// with the (possibly transliterated) artist + English title. If the returned video ID
// matches a library song's youtubeId, we found the same track under a different title.
async function enrichByYouTubeIds(
  unmatched: Array<{ idx: number; songName: string }>,
  artistName: string,
  library: Song[],
  tokenRef: React.MutableRefObject<number>,
  token: number,
  onMatch: (idx: number, song: Song) => void,
  onDone: () => void,
) {
  // Build a fast lookup: youtubeId → library song (restricted to this artist)
  const byVideoId = new Map<string, Song>()
  for (const s of library) {
    if (normStr(s.artist) === normStr(artistName) && s.youtubeId) {
      byVideoId.set(s.youtubeId, s)
    }
  }

  if (byVideoId.size === 0) { onDone(); return }

  const CONCURRENCY = 3
  for (let i = 0; i < unmatched.length; i += CONCURRENCY) {
    if (tokenRef.current !== token) { onDone(); return }
    await Promise.all(
      unmatched.slice(i, i + CONCURRENCY).map(async ({ idx, songName }) => {
        if (tokenRef.current !== token) return
        try {
          const videoIds = await searchYouTubeVideoIds(artistName, songName, 15)
          const matched = videoIds.find(id => byVideoId.has(id))
          if (matched && tokenRef.current === token) {
            onMatch(idx, byVideoId.get(matched)!)
          }
        } catch { /* ignore */ }
      })
    )
  }

  if (tokenRef.current === token) onDone()
}

// ─── ImportActions ─────────────────────────────────────────────────────────────

interface ImportActionsProps {
  checkedCount: number
  missingCount: number
  importingCount: number
  enriching: boolean
  onSelectAll: () => void
  onDeselectAll: () => void
  onImport: () => void
}

function ImportActions({ checkedCount, missingCount, importingCount, enriching, onSelectAll, onDeselectAll, onImport }: ImportActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        onClick={onSelectAll}
        disabled={importingCount > 0 || missingCount === 0}
      >
        Select all
      </button>
      <span className="text-xs text-muted-foreground">·</span>
      <button
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        onClick={onDeselectAll}
        disabled={importingCount > 0 || checkedCount === 0}
      >
        Deselect all
      </button>
      {enriching && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Checking library…
        </span>
      )}
      <div className="flex-1" />
      <Button size="sm" onClick={onImport} disabled={checkedCount === 0 || importingCount > 0}>
        {importingCount > 0
          ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Importing…</>
          : `Import Selected (${checkedCount})`
        }
      </Button>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SetlistImportPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('search')
  const [artistQuery, setArtistQuery] = useState('')
  const [artists, setArtists] = useState<SetlistArtist[]>([])
  const [selectedArtist, setSelectedArtist] = useState<SetlistArtist | null>(null)
  const [setlists, setSetlists] = useState<Setlist[]>([])
  const [selectedSetlist, setSelectedSetlist] = useState<Setlist | null>(null)
  const [songStates, setSongStates] = useState<SongImportState[]>([])
  const [checkedSongs, setCheckedSongs] = useState<Set<number>>(new Set())
  const [library, setLibrary] = useState<Song[]>([])
  const [libraryArtist, setLibraryArtist] = useState('')
  const [enriching, setEnriching] = useState(false)

  const [searching, setSearching] = useState(false)
  const [loadingSetlists, setLoadingSetlists] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [playlistName, setPlaylistName] = useState('')
  const [concertDateInput, setConcertDateInput] = useState('')
  const [creatingPlaylist, setCreatingPlaylist] = useState(false)
  const [createdPlaylistId, setCreatedPlaylistId] = useState<string | null>(null)

  const enrichToken = useRef(0)

  const hasApiKey = !!import.meta.env.VITE_SETLISTFM_API_KEY

  useEffect(() => {
    fetchSongs().then(setLibrary).catch(() => {})
  }, [])

  if (!user) {
    navigate('/auth')
    return null
  }

  // ── Enrichment helpers ─────────────────────────────────────────────────────

  function startYouTubeEnrichment(
    states: SongImportState[],
    artistName: string,
    lib: Song[],
  ) {
    const unmatched = states
      .map((s, idx) => ({ idx, songName: s.song.name }))
      .filter(({ idx }) => states[idx].status === 'not-imported')

    if (unmatched.length === 0) return

    const token = ++enrichToken.current
    setEnriching(true)

    enrichByYouTubeIds(
      unmatched, artistName, lib, enrichToken, token,
      (idx, song) => {
        setSongStates(prev => prev.map((s, i) =>
          i === idx && s.status === 'not-imported'
            ? { ...s, status: 'in-library', songId: song.id }
            : s
        ))
        setCheckedSongs(prev => { const n = new Set(prev); n.delete(idx); return n })
      },
      () => { if (enrichToken.current === token) setEnriching(false) },
    )
  }

  // ── Step 1 ─────────────────────────────────────────────────────────────────

  async function handleSearchArtists() {
    if (!artistQuery.trim()) return
    setSearching(true)
    setError(null)
    setNotFound(false)
    setArtists([])
    try {
      const results = await searchSetlistArtists(artistQuery.trim())
      if (results.length === 0) {
        setNotFound(true)
      } else {
        setArtists(results)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('404')) {
        setNotFound(true)
      } else {
        setError(msg || 'Search failed')
      }
    } finally {
      setSearching(false)
    }
  }

  function resetToSearch() {
    enrichToken.current++
    setStep('search')
    setArtists([])
    setSetlists([])
    setSongStates([])
    setCheckedSongs(new Set())
    setSelectedArtist(null)
    setSelectedSetlist(null)
    setCreatedPlaylistId(null)
    setLibraryArtist('')
    setConcertDateInput('')
    setEnriching(false)
    setNotFound(false)
    setError(null)
  }

  // ── Step 2 ─────────────────────────────────────────────────────────────────

  async function handleSelectArtist(artist: SetlistArtist) {
    setSelectedArtist(artist)
    setLoadingSetlists(true)
    setError(null)
    setStep('concerts')
    try {
      const results = await getArtistSetlists(artist.mbid)
      if (results.length === 0) setError(`No recent concerts with setlists found for ${artist.name}.`)
      setSetlists(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load concerts')
    } finally {
      setLoadingSetlists(false)
    }
  }

  // ── Step 3 ─────────────────────────────────────────────────────────────────

  function handleSelectSetlist(setlist: Setlist) {
    setSelectedSetlist(setlist)
    const artistName = setlist.artist.name
    setLibraryArtist(artistName)
    const states = buildStates(extractSetlistSongs(setlist), library, artistName)
    setSongStates(states)
    setCheckedSongs(defaultChecked(states))
    setPlaylistName(`${artistName} at ${setlist.venue.name} (${formatSetlistDate(setlist.eventDate)})`)
    const [dd, mm, yyyy] = setlist.eventDate.split('-')
    setConcertDateInput(`${yyyy}-${mm}-${dd}`)
    setStep('songs')
    setCreatedPlaylistId(null)
    startYouTubeEnrichment(states, artistName, library)
  }

  function handleLibraryArtistChange(newName: string) {
    setLibraryArtist(newName)
    if (!selectedSetlist) return

    // Cancel any running enrichment
    enrichToken.current++
    setEnriching(false)

    const songs = extractSetlistSongs(selectedSetlist)
    const next = songs.map((song, i): SongImportState => {
      const cur = songStates[i]
      if (cur?.status === 'importing' || cur?.status === 'imported') return cur
      const existing = findInLibrary(library, newName, song.name)
      return existing
        ? { song, status: 'in-library', songId: existing.id }
        : { song, status: 'not-imported', songId: undefined }
    })
    setSongStates(next)
    setCheckedSongs(prev => {
      const updated = new Set(prev)
      next.forEach((state, i) => {
        if (state.status === 'in-library') updated.delete(i)
        else if (state.status === 'not-imported' && songStates[i]?.status === 'in-library') updated.add(i)
      })
      return updated
    })

    // Re-run YouTube enrichment with the new artist name
    startYouTubeEnrichment(next, newName, library)
  }

  function toggleCheck(idx: number) {
    setCheckedSongs(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  function selectAllMissing() {
    setCheckedSongs(new Set(songStates.flatMap((s, i) => s.status === 'not-imported' ? [i] : [])))
  }

  function deselectAll() { setCheckedSongs(new Set()) }

  function updateSong(index: number, patch: Partial<SongImportState>) {
    setSongStates(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s))
  }

  async function importSong(index: number, songName: string) {
    updateSong(index, { status: 'importing' })
    try {
      // YouTube URL is required — a song without one can't be played or practiced
      let videoId = await searchYouTubeVideo(libraryArtist, songName)
      if (!videoId && selectedArtist && selectedArtist.name !== libraryArtist) {
        videoId = await searchYouTubeVideo(selectedArtist.name, songName)
      }
      if (!videoId) {
        updateSong(index, { status: 'error', error: 'YouTube video not found — open the song editor to add a URL manually' })
        return
      }

      const lyrics = await fetchLyrics(libraryArtist, songName)

      const saved = await saveSongRemote({
        id: crypto.randomUUID(),
        title: songName,
        artist: libraryArtist,
        language: 'en',
        youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
        youtubeId: videoId,
        lyrics: lyrics?.lines ?? [],
        createdAt: Date.now(),
      }, user!.id)
      addStars(user!.id, 1).catch(() => {})
      updateSong(index, { status: 'imported', songId: saved.id })
      setCheckedSongs(prev => { const n = new Set(prev); n.delete(index); return n })
    } catch (err) {
      updateSong(index, { status: 'error', error: err instanceof Error ? err.message : 'Failed' })
    }
  }

  async function handleImportChecked() {
    const sorted = [...checkedSongs].sort((a, b) => a - b)
    for (const idx of sorted) {
      if (songStates[idx]?.status === 'not-imported') {
        await importSong(idx, songStates[idx].song.name)
      }
    }
  }

  async function handleCreatePlaylist() {
    if (!user || !selectedSetlist || !playlistName.trim()) return
    setCreatingPlaylist(true)
    setError(null)
    try {
      const concertDate = concertDateInput || undefined
      const playlist = await createPlaylist(playlistName.trim(), user.id, concertDate)
      const available = songStates.filter(s => (s.status === 'in-library' || s.status === 'imported') && s.songId)
      for (let i = 0; i < available.length; i++) {
        await addSongToPlaylist(playlist.id, available[i].songId!, i)
      }
      setCreatedPlaylistId(playlist.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create playlist')
    } finally {
      setCreatingPlaylist(false)
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const inLibraryCount = songStates.filter(s => s.status === 'in-library' || s.status === 'imported').length
  const missingCount = songStates.filter(s => s.status === 'not-imported').length
  const importingCount = songStates.filter(s => s.status === 'importing').length
  const checkedCount = checkedSongs.size

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Mic2 className="h-6 w-6" /> Import Live Concert
          </h1>
          <p className="text-sm text-muted-foreground">
            Setlist data provided by{' '}
            <a
              href="https://www.setlist.fm"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              setlist.fm
            </a>
          </p>
        </div>
      </div>

      {!hasApiKey && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-4 text-sm space-y-2">
          <p className="font-medium text-amber-800 dark:text-amber-200">API key required</p>
          <p className="text-amber-700 dark:text-amber-300">
            Register at{' '}
            <a href="https://www.setlist.fm/settings/apps" target="_blank" rel="noopener noreferrer" className="underline">
              setlist.fm/settings/apps
            </a>
            , then add <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">VITE_SETLISTFM_API_KEY=your-key</code> to{' '}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">.env.local</code> and restart.
          </p>
        </div>
      )}

      {/* Step 1 */}
      <section className="space-y-3">
        {step !== 'search' ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Artist:</span>
            <Badge variant="secondary">{selectedArtist?.name}</Badge>
            <button
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              onClick={resetToSearch}
            >
              Change
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <Input
                placeholder="Artist or band name…"
                value={artistQuery}
                onChange={e => setArtistQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearchArtists() }}
                disabled={searching || !hasApiKey}
                autoFocus
              />
              <Button onClick={handleSearchArtists} disabled={searching || !artistQuery.trim() || !hasApiKey}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
              </Button>
            </div>
            {/* Artist not found — clarify it's a search result, not an error */}
            {notFound && (
              <p className="text-sm text-muted-foreground">
                No artists found for <strong>"{artistQuery}"</strong>. Try a different spelling or their full name — e.g. <em>"The Beatles"</em> instead of <em>"Beatles"</em>.
              </p>
            )}

            {/* Unexpected error — quota, network, etc. */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription>
                  We hit an unexpected error — this is likely a temporary service limit.
                  If it keeps happening, please contact us at{' '}
                  <a href="mailto:support@lyricslabs.com" className="underline underline-offset-2">
                    support@lyricslabs.com
                  </a>
                </AlertDescription>
              </Alert>
            )}

            {/* How it works — shown until the first search */}
            {artists.length === 0 && !notFound && !error && !searching && (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">How it works</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {([
                    {
                      icon: Search,
                      title: 'Search an artist',
                      desc: 'Find any band or solo artist by name. We look them up on setlist.fm.',
                    },
                    {
                      icon: Calendar,
                      title: 'Pick a concert',
                      desc: 'Browse their last 5 shows that have a published setlist.',
                    },
                    {
                      icon: ListMusic,
                      title: 'Import & create',
                      desc: 'Add missing songs to your library and turn the concert into a playlist — in setlist order.',
                    },
                  ] as const).map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="rounded-lg border bg-card p-4 space-y-2">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <p className="text-sm font-medium">{title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Also great for</p>
                  <div className="flex flex-wrap gap-2">
                    {['Discovering songs you haven\'t heard', 'Building a concert-night playlist', 'Catching up on a tour you missed', 'Comparing setlists across shows'].map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                        <Music2 className="h-3 w-3" />{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {artists.length > 0 && (
              <div className="space-y-1">
                {artists.slice(0, 8).map(artist => (
                  <button
                    key={artist.mbid}
                    onClick={() => handleSelectArtist(artist)}
                    className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <span className="font-medium">{artist.name}</span>
                    {artist.disambiguation && (
                      <span className="ml-2 text-xs text-muted-foreground">({artist.disambiguation})</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Step 2 */}
      {step === 'concerts' && (
        <section className="space-y-3">
          <div>
            <h2 className="font-semibold">Recent Concerts</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Pick a recent show as a setlist template — you'll set your actual concert date in the next step.</p>
          </div>
          {loadingSetlists ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading concerts…
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>
                We couldn't load concerts for this artist — this might be a temporary service limit.
                Please try again or contact us at{' '}
                <a href="mailto:support@lyricslabs.com" className="underline underline-offset-2">
                  support@lyricslabs.com
                </a>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {setlists.map(setlist => (
                <button
                  key={setlist.id}
                  onClick={() => handleSelectSetlist(setlist)}
                  className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        {formatSetlistDate(setlist.eventDate)}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          {setlist.venue.name}, {setlist.venue.city.name}
                          {setlist.venue.city.country.code !== 'US' && `, ${setlist.venue.city.country.name}`}
                        </span>
                      </div>
                      {setlist.tour && (
                        <p className="text-xs text-muted-foreground truncate">{setlist.tour.name}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="shrink-0 gap-1 text-xs">
                      <List className="h-3 w-3" />
                      {extractSetlistSongs(setlist).length} songs
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Step 3 */}
      {step === 'songs' && selectedSetlist && (
        <section className="space-y-4">
          <div>
            <h2 className="font-semibold text-lg">{selectedSetlist.venue.name}</h2>
            <p className="text-sm text-muted-foreground">
              {selectedSetlist.venue.city.name}, {selectedSetlist.venue.city.country.name} — {formatSetlistDate(selectedSetlist.eventDate)}
            </p>
            {selectedSetlist.tour && (
              <p className="text-xs text-muted-foreground mt-0.5">{selectedSetlist.tour.name}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Your concert date:</label>
              <input
                type="date"
                value={concertDateInput}
                onChange={e => setConcertDateInput(e.target.value)}
                className="h-7 rounded border bg-background px-2 text-sm text-foreground"
              />
            </div>
          </div>

          {/* Library artist override */}
          <div className="rounded-lg border bg-muted/30 px-3 py-2.5 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Artist name in your library</label>
            <Input
              className="h-8 text-sm"
              value={libraryArtist}
              onChange={e => handleLibraryArtistChange(e.target.value)}
              placeholder="e.g. משינה"
            />
            <p className="text-xs text-muted-foreground">
              setlist.fm uses English. Change this to match your library, then we'll cross-check via YouTube video IDs to catch title differences.
            </p>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>{songStates.length} songs</span>
            {inLibraryCount > 0 && <span className="text-green-600 dark:text-green-400">{inLibraryCount} in library</span>}
            {missingCount > 0 && <span>{missingCount} not imported</span>}
            {importingCount > 0 && <span className="text-blue-600 dark:text-blue-400">{importingCount} importing…</span>}
          </div>

          {/* Top action bar */}
          {missingCount > 0 && (
            <ImportActions
              checkedCount={checkedCount}
              missingCount={missingCount}
              importingCount={importingCount}
              enriching={enriching}
              onSelectAll={selectAllMissing}
              onDeselectAll={deselectAll}
              onImport={handleImportChecked}
            />
          )}

          {/* Song rows */}
          <div className="space-y-1">
            {songStates.map((state, i) => {
              const selectable = state.status === 'not-imported' || state.status === 'error'
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2.5 rounded-lg border p-2.5 transition-colors ${selectable && checkedSongs.has(i) ? 'bg-muted/30' : ''}`}
                >
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {selectable && (
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                        checked={checkedSongs.has(i)}
                        onChange={() => toggleCheck(i)}
                        disabled={importingCount > 0}
                      />
                    )}
                  </div>
                  <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{state.song.name}</p>
                    {state.song.cover && (
                      <p className="text-xs text-muted-foreground">cover of {state.song.cover.name}</p>
                    )}
                  </div>
                  {state.status === 'in-library' && (
                    <Badge variant="outline" className="shrink-0 gap-1 text-xs text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3" /> In library
                    </Badge>
                  )}
                  {state.status === 'imported' && (
                    <Badge variant="outline" className="shrink-0 gap-1 text-xs text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400">
                      <CheckCircle2 className="h-3 w-3" /> Added
                    </Badge>
                  )}
                  {state.status === 'importing' && (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                  )}
                  {state.status === 'error' && (
                    <span title={state.error ?? 'Import failed'}>
                      <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Bottom action bar */}
          {missingCount > 0 && (
            <ImportActions
              checkedCount={checkedCount}
              missingCount={missingCount}
              importingCount={importingCount}
              enriching={enriching}
              onSelectAll={selectAllMissing}
              onDeselectAll={deselectAll}
              onImport={handleImportChecked}
            />
          )}

          {/* Playlist creation */}
          {inLibraryCount > 0 && !createdPlaylistId && (
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="flex items-center gap-2 font-medium">
                <ListMusic className="h-4 w-4" /> Create Playlist from this Concert
              </h3>
              <div className="flex gap-2">
                <Input
                  value={playlistName}
                  onChange={e => setPlaylistName(e.target.value)}
                  placeholder="Playlist name…"
                  disabled={creatingPlaylist}
                />
                <Button onClick={handleCreatePlaylist} disabled={creatingPlaylist || !playlistName.trim()}>
                  {creatingPlaylist ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Includes {inLibraryCount} song{inLibraryCount === 1 ? '' : 's'} from your library, in setlist order.
              </p>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}

          {createdPlaylistId && (
            <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Playlist created!</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => navigate(`/playlists/${createdPlaylistId}/play`)}>
                  Play
                </Button>
                <Button size="sm" onClick={() => navigate('/playlists')}>
                  View playlists
                </Button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
