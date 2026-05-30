import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Search, Globe, User, X, Music2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SongCard } from '@/components/songs/SongCard'
import { BandSearchDialog } from '@/components/songs/BandSearchDialog'
import { useAuth } from '@/contexts/AuthContext'
import { fetchSongs, fetchMySongs, searchSongs, deleteSongRemote } from '@/lib/db'
import type { Song } from '@/types'

type View = 'all' | 'mine'

export function HomePage() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const [view, setView] = useState<View>('all')
  const [query, setQuery] = useState('')
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterArtist, setFilterArtist] = useState('')
  const [filterLanguage, setFilterLanguage] = useState('')
  const [bandDialogOpen, setBandDialogOpen] = useState(false)

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

  // Reset filters when view or query changes
  useEffect(() => {
    setFilterArtist('')
    setFilterLanguage('')
  }, [view, query])

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

  const filteredSongs = useMemo(() =>
    songs
      .filter(s => !filterArtist || filterArtist === ALL || s.artist === filterArtist)
      .filter(s => !filterLanguage || filterLanguage === ALL || s.language === filterLanguage),
    [songs, filterArtist, filterLanguage]
  )

  const hasActiveFilters = filterArtist || filterLanguage

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('home.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? '…' : t('home.songCount', { count: filteredSongs.length })}
          </p>
        </div>
        {user && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBandDialogOpen(true)}>
              <Music2 className="h-4 w-4" />
              Import Band
            </Button>
            <Button asChild>
              <Link to="/songs/new">
                <Plus className="h-4 w-4" />
                {t('nav.addSong')}
              </Link>
            </Button>
          </div>
        )}
      </div>

      {user && (
        <Tabs value={view} onValueChange={(v) => { setView(v as View); setQuery('') }}>
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

      {/* Filters — only show when songs are loaded and there's variety to filter */}
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
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground mb-4">
            {query ? `No songs match "${query}"` : hasActiveFilters ? 'No songs match the selected filters' : t('home.empty')}
          </p>
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
        <div className="grid gap-2">
          {filteredSongs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              onDelete={view === 'mine' ? () => handleDelete(song.id) : undefined}
            />
          ))}
        </div>
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
    </div>
  )
}
