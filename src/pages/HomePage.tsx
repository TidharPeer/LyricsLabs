import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Search, Globe, User, X, ChevronLeft, ChevronRight, Music, Mic2, Users, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HeroSection } from '@/components/home/HeroSection'
import { RecentlyPlayed } from '@/components/home/RecentlyPlayed'
import { DiscoverSection } from '@/components/home/DiscoverSection'
import { SongCard } from '@/components/songs/SongCard'
import { BandSearchDialog } from '@/components/songs/BandSearchDialog'
import { EditSongDialog } from '@/components/songs/EditSongDialog'
import { YouTubeSearchDialog } from '@/components/songs/YouTubeSearchDialog'
import { ArtistsGrid } from '@/components/songs/ArtistsGrid'
import { useAuth } from '@/contexts/AuthContext'
import { fetchSongs, fetchMySongs, searchSongs, deleteSongRemote } from '@/lib/db'
import type { Song } from '@/types'


type View = 'home' | 'all' | 'mine' | 'artists' | string

// Module-level: survives StrictMode remounts so we can deduplicate in-flight fetches
let _pendingKey = ''
let _fetchEpoch = 0
let _songsCache: { key: string; songs: Song[] } | null = null

function useSongs(view: View, query: string, userId: string | undefined) {
  // 'home' with no active search = noop (recently played / discover shows instead)
  const isNoop = (view === 'mine' && !userId) || (view === 'home' && query.length < 2)
  const cacheKey = isNoop ? '__noop__' : `${view}|${query}|${userId ?? 'guest'}`
  const cached = _songsCache?.key === cacheKey ? _songsCache.songs : null

  const [songs, setSongs] = useState<Song[]>(cached ?? [])
  const [loading, setLoading] = useState(!cached && !isNoop)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  // Always-current refs so async callbacks update the live component, not a stale one
  const setSongsRef = useRef(setSongs)
  const setLoadingRef = useRef(setLoading)
  const setErrorRef = useRef(setError)
  setSongsRef.current = setSongs
  setLoadingRef.current = setLoading
  setErrorRef.current = setError

  useEffect(() => {
    if (isNoop) { setLoading(false); return }

    // Serve from cache on remount (e.g. navigation back)
    if (reloadToken === 0 && _songsCache?.key === cacheKey) {
      setSongs(_songsCache.songs)
      setLoading(false)
      return
    }

    const fetchKey = `${cacheKey}|${reloadToken}`

    // An identical fetch is already in-flight (StrictMode remount guard)
    if (fetchKey === _pendingKey) return
    _pendingKey = fetchKey
    const myEpoch = ++_fetchEpoch

    setLoading(true)
    setError(null)

    const isSearch = query.length >= 2
    const timer = setTimeout(async () => {
      if (_fetchEpoch !== myEpoch) return  // superseded by a newer fetch
      try {
        const result = isSearch
          ? await searchSongs(query)
          : view === 'mine'
            ? await fetchMySongs(userId!)
            : await fetchSongs()
        if (_fetchEpoch !== myEpoch) return
        _songsCache = { key: cacheKey, songs: result }
        _pendingKey = ''
        setSongsRef.current(result)
        setLoadingRef.current(false)
      } catch (err) {
        if (_fetchEpoch !== myEpoch) return
        _pendingKey = ''
        setErrorRef.current(err instanceof Error ? err.message : 'Failed to load songs')
        setLoadingRef.current(false)
      }
    }, isSearch ? 400 : 0)

    return () => {
      // Only cancel debounced search timers so they don't fire for stale queries.
      // Non-debounced fetches are intentionally left running so they can complete
      // and update the component even after a StrictMode unmount/remount cycle.
      if (isSearch) clearTimeout(timer)
    }
  }, [view, query, userId, reloadToken, cacheKey, isNoop])

  const reload = useCallback(() => {
    _songsCache = null
    _pendingKey = ''
    _fetchEpoch++
    setReloadToken(t => t + 1)
  }, [])
  return { songs, setSongs, loading, error, setError, reload }
}

export function HomePage() {
  const { t } = useTranslation()
  const { user, loading: authLoading } = useAuth()

  const [view, setView] = useState<View>(() => {
    const saved = sessionStorage.getItem('homeView') ?? 'home'
    // 'all' intentionally not restored — recently played IS the home, 'all' is explicit browsing
    if (saved === 'mine' || saved === 'artists' || saved === 'home') return saved
    if (saved.startsWith('artist:')) {
      const tabs: string[] = JSON.parse(sessionStorage.getItem('artistTabs') ?? '[]')
      if (tabs.includes(saved.slice(7))) return saved
    }
    return 'home'
  })

  const [artistTabs, setArtistTabs] = useState<string[]>(() => {
    try { return JSON.parse(sessionStorage.getItem('artistTabs') ?? '[]') }
    catch { return [] }
  })

  // Per-user dismiss state (so a new user on a shared device always sees the hero)
  const [heroDismissed, setHeroDismissed] = useState(false)
  // Logged-out users always see the full hero; this tracks a within-session dismiss for them
  const [sessionDismissed, setSessionDismissed] = useState(false)
  const [query, setQuery] = useState('')
  const [searchActive, setSearchActive] = useState(false)
  // Once the user has typed anything, clearing the search expands the hero again
  const [hasSearched, setHasSearched] = useState(false)
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce: collapse hero when typing, expand when cleared
  useEffect(() => {
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)
    collapseTimerRef.current = setTimeout(() => {
      const active = query.length > 0
      setSearchActive(active)
      if (active) setHasSearched(true)
    }, 400)
    return () => { if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current) }
  }, [query])

  // Per-user onboarding flag — keyed by userId so a new user never inherits another user's dismissed state
  const showHero = !heroDismissed && (user
    ? !localStorage.getItem(`lyricsLabsOnboarded:${user.id}`)
    : true)

  // Show the HeroSection only for onboarding users OR after a returning user has typed-then-cleared
  const showHeroSection = showHero || (hasSearched && !searchActive)

  // Collapse when: actively searching, OR logged-out dismissed this session,
  // OR returning user who hasn't completed a type-then-clear cycle yet
  const heroCollapsed = searchActive || sessionDismissed || (!!user && !showHero && !hasSearched)

  function dismissHero() {
    if (user) {
      localStorage.setItem(`lyricsLabsOnboarded:${user.id}`, '1')
      setHeroDismissed(true)
    } else {
      setSessionDismissed(true)
    }
  }

  // When browsing the artists grid, pass empty query so DB isn't queried (we filter client-side)
  const fetchQuery = view === 'artists' ? '' : query
  const { songs, setSongs, loading, error, setError, reload } = useSongs(view, fetchQuery, user?.id)
  const [filterArtist, setFilterArtist] = useState('')
  const [filterLanguage, setFilterLanguage] = useState('')
  const [bandDialogOpen, setBandDialogOpen] = useState(false)
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const [editingSong, setEditingSong] = useState<Song | null>(null)
  const [sortBy, setSortBy] = useState<'az' | 'recent'>('az')
  const [currentPage, setCurrentPage] = useState(1)

  const PAGE_SIZE = 20

  // When true: show the songs list / search results. When false: show recently played / discover.
  const showBrowse = view !== 'home' || query.length >= 2

  const tabArtist = view.startsWith('artist:') ? view.slice(7) : null

  function openArtistTab(artist: string) {
    setArtistTabs(prev => {
      if (prev.includes(artist)) return prev
      const next = [...prev, artist]
      sessionStorage.setItem('artistTabs', JSON.stringify(next))
      return next
    })
    const v = `artist:${artist}`
    setView(v)
    setQuery('')
    sessionStorage.setItem('homeView', v)
  }

  function closeArtistTab(artist: string, e: React.MouseEvent) {
    e.stopPropagation()
    setArtistTabs(prev => {
      const next = prev.filter(a => a !== artist)
      sessionStorage.setItem('artistTabs', JSON.stringify(next))
      return next
    })
    if (view === `artist:${artist}`) {
      setView('artists')
      sessionStorage.setItem('homeView', 'artists')
    }
  }

  function switchView(v: string) {
    setView(v as View)
    setQuery('')
    sessionStorage.setItem('homeView', v)
  }

  useEffect(() => {
    setFilterArtist('')
    setFilterLanguage('')
    setSortBy('az')
    setCurrentPage(1)
  }, [view, query])

  function handleEditSaved(updated: Song) {
    setSongs(prev => prev.map(s => s.id === updated.id ? updated : s))
    setEditingSong(null)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this song?')) return
    try {
      await deleteSongRemote(id)
      setSongs(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const uniqueArtists = useMemo(() =>
    [...new Set(songs.map(s => s.artist).filter(Boolean))].sort(),
    [songs]
  )

  const uniqueLanguages = useMemo(() =>
    [...new Set(songs.map(s => s.language).filter(Boolean))].sort(),
    [songs]
  )

  const ALL = '__all__'

  const filteredSongs = useMemo(() => {
    return [...songs]
      .filter(s => !tabArtist || s.artist === tabArtist)
      .filter(s => !filterArtist || filterArtist === ALL || s.artist === filterArtist)
      .filter(s => !filterLanguage || filterLanguage === ALL || s.language === filterLanguage)
      .sort((a, b) => {
        if (sortBy === 'recent') return b.createdAt - a.createdAt
        return a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title)
      })
  }, [songs, tabArtist, filterArtist, filterLanguage, sortBy])

  const totalPages = Math.ceil(filteredSongs.length / PAGE_SIZE)
  const pagedSongs = useMemo(
    () => filteredSongs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredSongs, currentPage, PAGE_SIZE]
  )

  const hasActiveFilters = filterArtist || filterLanguage

  useEffect(() => { setCurrentPage(1) }, [filterArtist, filterLanguage])

  function fmtCount(n: number) {
    if (n >= 1000) return `${Math.round(n / 100) / 10}k`
    return String(n)
  }

  if (authLoading && !user) return null

  return (
    <div className="space-y-5">
      {showHeroSection ? (
        <HeroSection
          query={query}
          setQuery={setQuery}
          user={user}
          onDismiss={dismissHero}
          collapsed={heroCollapsed}
          placeholder={view === 'artists' ? 'Search artists…' : tabArtist ? `Search songs by ${tabArtist}…` : t('home.search')}
        />
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9 pr-9"
            placeholder={view === 'artists' ? 'Search artists…' : tabArtist ? `Search songs by ${tabArtist}…` : t('home.search')}
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {heroCollapsed && showBrowse && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">
            {view === 'all' ? t('auth.allSongs')
              : view === 'mine' ? t('auth.mySongs')
              : view === 'artists' ? 'Artists'
              : view === 'home' ? 'Search Results'
              : tabArtist ?? t('auth.allSongs')}
            {!loading && view !== 'artists' && (
              <span className="ml-1.5 text-lg font-normal text-muted-foreground">
                ({fmtCount(filteredSongs.length)})
              </span>
            )}
          </h1>
          {user && (
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" asChild>
                <Link to="/import-concert">
                  <Mic2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Import Concert</span>
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/songs/new">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add via URL</span>
                </Link>
              </Button>
              <Button onClick={() => setSearchDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                {t('nav.addSong')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Add-song buttons — always visible for logged-in users on home view */}
      {!showBrowse && user && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" asChild>
            <Link to="/import-concert">
              <Mic2 className="h-4 w-4" />
              <span className="hidden sm:inline">Import Concert</span>
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/songs/new">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add via URL</span>
            </Link>
          </Button>
          <Button onClick={() => setSearchDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            {t('nav.addSong')}
          </Button>
        </div>
      )}

      {user && (
        <div className="flex items-start gap-2">
          <Tabs value={view} onValueChange={switchView} className="flex-1 min-w-0">
            <div className="overflow-x-auto pb-px">
              <TabsList className="w-max flex-nowrap">
                <TabsTrigger value="home" className="shrink-0 gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Recently Played
                </TabsTrigger>
                <TabsTrigger value="all" className="shrink-0 gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  {t('auth.allSongs')}
                </TabsTrigger>
                <TabsTrigger value="mine" className="shrink-0 gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {t('auth.mySongs')}
                </TabsTrigger>
                {artistTabs.map(artist => (
                  <TabsTrigger key={artist} value={`artist:${artist}`} className="shrink-0 gap-1 pl-3 pr-1.5">
                    <Music className="h-3.5 w-3.5 shrink-0" />
                    <span className="max-w-[8rem] truncate">{artist}</span>
                    <span
                      role="button"
                      tabIndex={-1}
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => closeArtistTab(artist, e)}
                      className="ml-0.5 rounded p-0.5 opacity-60 hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/15"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
          <Button
            variant={view === 'artists' ? 'secondary' : 'outline'}
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => switchView(view === 'artists' ? 'home' : 'artists')}
          >
            <Users className="h-3.5 w-3.5" />
            Browse Artists
          </Button>
        </div>
      )}

      {/* Recently played + discover — shown on home view with no active search */}
      {!showBrowse && (
        <>
          {user && <RecentlyPlayed userId={user.id} />}
          <DiscoverSection />
        </>
      )}

      {/* Filters — hidden for artists grid, artist tabs, and home view */}
      {showBrowse && !loading && songs.length > 1 && !query && view !== 'artists' && (
        <div className="flex flex-wrap items-center gap-2">
          {uniqueArtists.length > 1 && !tabArtist && (
            <Select value={filterArtist || ALL} onValueChange={v => setFilterArtist(v === ALL ? '' : v)}>
              <SelectTrigger className="h-8 w-auto min-w-32 text-xs">
                <SelectValue placeholder="All artists" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All artists</SelectItem>
                {uniqueArtists.map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {uniqueLanguages.length > 1 && (
            <Select value={filterLanguage || ALL} onValueChange={v => setFilterLanguage(v === ALL ? '' : v)}>
              <SelectTrigger className="h-8 w-auto min-w-32 text-xs">
                <SelectValue placeholder="All languages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All languages</SelectItem>
                {uniqueLanguages.map(l => (
                  <SelectItem key={l} value={l}>{t(`languages.${l}`, l)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={sortBy} onValueChange={v => setSortBy(v as 'az' | 'recent')}>
            <SelectTrigger className="h-8 w-auto min-w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="az">A–Z</SelectItem>
              <SelectItem value="recent">Recently Added</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-xs"
              onClick={() => { setFilterArtist(''); setFilterLanguage('') }}
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Artists grid */}
      {view === 'artists' && (
        loading
          ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 rounded-lg border bg-muted/30 animate-pulse" />)}
            </div>
          : <ArtistsGrid songs={songs} query={query} onArtistClick={openArtistTab} />
      )}

      {showBrowse && view !== 'artists' && error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500 break-all">
          Could not load songs: {error}
        </div>
      )}

      {showBrowse && view !== 'artists' && loading && songs.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl border bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : showBrowse && view !== 'artists' && filteredSongs.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center gap-3">
          <p className="text-muted-foreground">
            {query ? `No songs found for "${query}"` : hasActiveFilters ? 'No songs match the selected filters' : t('home.empty')}
          </p>
          {query && (
            <>
              <p className="text-sm text-muted-foreground">
                Don't see it? Be the first to add it!
              </p>
              <Button onClick={() => setSearchDialogOpen(true)}>
                <Search className="h-4 w-4" />
                Search YouTube &amp; Add
              </Button>
            </>
          )}
          {!query && !hasActiveFilters && user && (
            <Button asChild>
              <Link to="/songs/new">
                <Plus className="h-4 w-4" />
                {t('home.addFirstSong')}
              </Link>
            </Button>
          )}
          {!query && !hasActiveFilters && !user && (
            <Button asChild variant="outline">
              <Link to="/auth">{t('auth.signInToAdd')}</Link>
            </Button>
          )}
        </div>
      ) : showBrowse && view !== 'artists' ? (
        <>
          <div className="grid gap-2">
            {pagedSongs.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                userId={user?.id}
                onDelete={(view === 'mine' || !!tabArtist) ? () => handleDelete(song.id) : undefined}
                onEdit={(view === 'mine' || !!tabArtist) ? () => setEditingSong(song) : undefined}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="sticky bottom-0 -mx-4 sm:-mx-6 border-t bg-background/95 backdrop-blur px-4 sm:px-6 py-3">
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : null}

      {user && (
        <BandSearchDialog
          open={bandDialogOpen}
          onOpenChange={setBandDialogOpen}
          existingSongs={songs}
          userId={user.id}
          onImportDone={reload}
        />
      )}

      {user && (
        <YouTubeSearchDialog
          open={searchDialogOpen}
          onOpenChange={setSearchDialogOpen}
        />
      )}

      {user && editingSong && (
        <EditSongDialog
          song={editingSong}
          open={true}
          onOpenChange={open => { if (!open) setEditingSong(null) }}
          onSaved={handleEditSaved}
          userId={user.id}
        />
      )}
    </div>
  )
}
