import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Search } from 'lucide-react'
import { useSongs } from '@/hooks/useSongs'
import { SongCard } from '@/components/songs/SongCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function HomePage() {
  const { t } = useTranslation()
  const { songs } = useSongs()
  const [query, setQuery] = useState('')

  const filtered = query
    ? songs.filter(
        (s) =>
          s.title.toLowerCase().includes(query.toLowerCase()) ||
          s.artist.toLowerCase().includes(query.toLowerCase())
      )
    : songs

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('home.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('home.songCount', { count: songs.length })}
          </p>
        </div>
        <Button asChild>
          <Link to="/songs/new">
            <Plus className="h-4 w-4" />
            {t('nav.addSong')}
          </Link>
        </Button>
      </div>

      {songs.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t('home.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground mb-4">{t('home.empty')}</p>
          <Button asChild>
            <Link to="/songs/new">
              <Plus className="h-4 w-4" />
              {t('home.addFirstSong')}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      )}
    </div>
  )
}
