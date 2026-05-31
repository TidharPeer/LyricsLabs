import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Search, Globe, User, X, Music2, ChevronLeft, ChevronRight, Music, Star, Flame, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SongCard } from '@/components/songs/SongCard'
import { BandSearchDialog } from '@/components/songs/BandSearchDialog'
import { EditSongDialog } from '@/components/songs/EditSongDialog'
import { YouTubeSearchDialog } from '@/components/songs/YouTubeSearchDialog'
import { useAuth } from '@/contexts/AuthContext'
import { fetchSongs, fetchMySongs, searchSongs, deleteSongRemote } from '@/lib/db'
import type { Song } from '@/types'

function DisclaimerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Disclaimer</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            LyricsLab is a personal, non-commercial project built for educational and entertainment purposes only. No fees are charged and no money is collected from users.
          </p>
          <p>
            Song lyrics displayed on this site are the property of their respective copyright holders. This site does not claim ownership of any lyrics or music content.
          </p>
          <p>
            By using this site, you acknowledge that the creator of LyricsLab is not liable for any claims, damages, or losses of any kind arising from your use of this service. You agree not to hold the creator responsible for any content or functionality provided.
          </p>
          <p>
            This site is provided "as is" without warranties of any kind. Use at your own discretion.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const CONCERT_BG = [
  'radial-gradient(ellipse 40% 62% at 14% 100%, rgba(255,100,15,0.55) 0%, transparent 62%)',
  'radial-gradient(ellipse 28% 48% at 50% 100%, rgba(255,225,55,0.48) 0%, transparent 54%)',
  'radial-gradient(ellipse 40% 62% at 86% 100%, rgba(150,30,255,0.50) 0%, transparent 62%)',
  'radial-gradient(ellipse 18% 45% at 2%  100%, rgba(30,90,255,0.38) 0%, transparent 54%)',
  'radial-gradient(ellipse 18% 45% at 98% 100%, rgba(0,200,170,0.32) 0%, transparent 54%)',
  'radial-gradient(ellipse 100% 38% at 50% 100%, rgba(140,35,12,0.28) 0%, transparent 48%)',
  'linear-gradient(175deg, #04030f 0%, #08051e 40%, #0f0618 70%, #060311 100%)',
].join(', ')

function LandingPage() {
  const [disclaimerOpen, setDisclaimerOpen] = useState(false)

  useEffect(() => {
    document.body.style.background = CONCERT_BG
    return () => { document.body.style.background = '' }
  }, [])

  const features = [
    {
      icon: <BookOpen className="h-6 w-6 text-indigo-400" />,
      iconBg: 'bg-indigo-500/20',
      title: 'Community Library',
      description: 'Browse hundreds of songs added by the community, ready to learn.',
    },
    {
      icon: <Music className="h-6 w-6 text-violet-400" />,
      iconBg: 'bg-violet-500/20',
      title: 'Karaoke Practice',
      description: 'Practice lyrics word-by-word with our interactive karaoke-style player.',
    },
    {
      icon: <Star className="h-6 w-6 text-amber-400" />,
      iconBg: 'bg-amber-500/20',
      title: 'Earn Stars',
      description: 'Get rewarded with stars as you complete songs and improve your accuracy.',
    },
    {
      icon: <Flame className="h-6 w-6 text-orange-400" />,
      iconBg: 'bg-orange-500/20',
      title: 'Daily Streaks',
      description: 'Build a daily practice habit and keep your streak alive.',
    },
  ]

  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <div className="flex flex-col items-center text-center py-16 gap-5 max-w-xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15">
          <Music className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white">LyricsLab</h1>
          <p className="mt-2 text-lg text-white/65">Master song lyrics through karaoke-style practice</p>
        </div>
        <p className="text-white/55">
          Build your personal song library, practice lyrics interactively, earn stars, and keep a daily streak — all in one place.
        </p>
        <Button size="lg" asChild className="mt-2 px-8">
          <Link to="/auth">Get Started — Sign In</Link>
        </Button>
      </div>

      {/* Features */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 flex flex-col gap-2">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${f.iconBg}`}>
              {f.icon}
            </div>
            <h3 className="font-semibold text-white">{f.title}</h3>
            <p className="text-sm text-white/55">{f.description}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-16 text-xs text-white/35">
        <button
          className="underline underline-offset-2 hover:text-white/65 transition-colors"
          onClick={() => setDisclaimerOpen(true)}
        >
          Disclaimer
        </button>
      </div>

      <DisclaimerDialog open={disclaimerOpen} onOpenChange={setDisclaimerOpen} />
    </div>
  )
}

type View = 'all' | 'mine'

export function HomePage() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const [view, setView] = useState<View>(() => {
    const saved = sessionStorage.getItem('homeView')
    return saved === 'mine' ? 'mine' : 'all'
  })
  const [query, setQuery] = useState('')
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterArtist, setFilterArtist] = useState('')
  const [filterLanguage, setFilterLanguage] = useState('')
  const [bandDialogOpen, setBandDialogOpen] = useState(false)
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const [editingSong, setEditingSong] = useState<Song | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const PAGE_SIZE = 20
  const RECENT_MS = 5 * 60 * 1000

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (query.length >= 2) {
        setSongs(await searchSongs(query))
      } else if (view === 'mine' && user) {
        setSongs(await fetchMySongs(user.id))
      } else {
        setSongs(await fetchSongs())
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load songs')
      setSongs([])
    } finally {
      setLoading(false)
    }
  }, [view, query, user])

  useEffect(() => {
    const timer = setTimeout(load, query ? 400 : 0)
    return () => clearTimeout(timer)
  }, [load, query])

  useEffect(() => {
    setFilterArtist('')
    setFilterLanguage('')
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
    const now = Date.now()
    return [...songs]
      .filter(s => !filterArtist || filterArtist === ALL || s.artist === filterArtist)
      .filter(s => !filterLanguage || filterLanguage === ALL || s.language === filterLanguage)
      .sort((a, b) => {
        const aNew = now - a.createdAt < RECENT_MS
        const bNew = now - b.createdAt < RECENT_MS
        if (aNew && !bNew) return -1
        if (!aNew && bNew) return 1
        if (aNew && bNew) return b.createdAt - a.createdAt
        return a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title)
      })
  }, [songs, filterArtist, filterLanguage, RECENT_MS])

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

  if (!user) {
    return <LandingPage />
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">
          {view === 'all' ? t('auth.allSongs') : t('auth.mySongs')}
          {!loading && (
            <span className="ml-1.5 text-lg font-normal text-muted-foreground">
              ({fmtCount(filteredSongs.length)})
            </span>
          )}
        </h1>
        {user && (
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" onClick={() => setBandDialogOpen(true)}>
              <Music2 className="h-4 w-4" />
              <span className="hidden sm:inline">Import Band</span>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/songs/new">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add via URL</span>
              </Link>
            </Button>
            <Button onClick={() => setSearchDialogOpen(true)}>
              <Search className="h-4 w-4" />
              {t('nav.addSong')}
            </Button>
          </div>
        )}
      </div>

      {user && (
        <Tabs value={view} onValueChange={(v) => { setView(v as View); setQuery(''); sessionStorage.setItem('homeView', v) }}>
          <TabsList>
            <TabsTrigger value="all" className="gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              {t('auth.allSongs')}
            </TabsTrigger>
            <TabsTrigger value="mine" className="gap-1.5">
              <User className="h-3.5 w-3.5" />
              {t('auth.mySongs')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={t('home.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Filters */}
      {!loading && songs.length > 1 && !query && (
        <div className="flex flex-wrap items-center gap-2">
          {uniqueArtists.length > 1 && (
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

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500 break-all">
          Could not load songs: {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl border bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : filteredSongs.length === 0 && !error ? (
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
      ) : (
        <>
          <div className="grid gap-2">
            {pagedSongs.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                userId={user?.id}
                onDelete={view === 'mine' ? () => handleDelete(song.id) : undefined}
                onEdit={view === 'mine' ? () => setEditingSong(song) : undefined}
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
      )}

      {user && (
        <BandSearchDialog
          open={bandDialogOpen}
          onOpenChange={setBandDialogOpen}
          existingSongs={songs}
          userId={user.id}
          onImportDone={load}
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
