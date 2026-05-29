import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Search, Globe, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SongCard } from '@/components/songs/SongCard'
import { useAuth } from '@/contexts/AuthContext'
import { fetchSongs, fetchMySongs, searchSongs } from '@/lib/db'
import { getSongs } from '@/lib/storage'
import type { Song } from '@/types'

type View = 'all' | 'mine'

export function HomePage() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const [view, setView] = useState<View>('all')
  const [query, setQuery] = useState('')
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      if (query.length >= 2) {
        setSongs(await searchSongs(query))
      } else if (view === 'mine' && user) {
        setSongs(await fetchMySongs(user.id))
      } else {
        setSongs(await fetchSongs())
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setFetchError(msg)
      const local = getSongs()
      setSongs(query ? local.filter(s =>
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        s.artist.toLowerCase().includes(query.toLowerCase())
      ) : local)
    } finally {
      setLoading(false)
    }
  }, [view, query, user])

  useEffect(() => {
    const timer = setTimeout(load, query ? 400 : 0)
    return () => clearTimeout(timer)
  }, [load, query])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('home.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? '…' : t('home.songCount', { count: songs.length })}
          </p>
        </div>
        {user && (
          <Button asChild>
            <Link to="/songs/new">
              <Plus className="h-4 w-4" />
              {t('nav.addSong')}
            </Link>
          </Button>
        )}
      </div>

      {/* All / My toggle (only when signed in) */}
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={t('home.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Supabase error banner — helps diagnose connectivity / RLS issues */}
      {fetchError && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 break-all">
          Cloud error: {fetchError}
        </div>
      )}

      {/* Song list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl border bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : songs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground mb-4">
            {query ? `No songs match "${query}"` : t('home.empty')}
          </p>
          {!query && user && (
            <Button asChild>
              <Link to="/songs/new">
                <Plus className="h-4 w-4" />
                {t('home.addFirstSong')}
              </Link>
            </Button>
          )}
          {!query && !user && (
            <Button asChild variant="outline">
              <Link to="/auth">{t('auth.signInToAdd')}</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-2">
          {songs.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      )}
    </div>
  )
}
