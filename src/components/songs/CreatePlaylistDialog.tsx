import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, X, Plus, Loader2, Music2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { createPlaylist, addSongToPlaylist, fetchSongs, searchSongs } from '@/lib/db'
import type { Song, Playlist } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  onCreated: (playlist: Playlist) => void
}

export function CreatePlaylistDialog({ open, onOpenChange, userId, onCreated }: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Song[]>([])
  const [selected, setSelected] = useState<Song[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const search = useCallback(async (q: string) => {
    setSearching(true)
    try {
      const songs = q.length >= 2 ? await searchSongs(q) : await fetchSongs()
      setResults(songs)
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => search(query), query ? 400 : 0)
    return () => clearTimeout(timer)
  }, [query, open, search])

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setName('')
      setQuery('')
      setSelected([])
      setError('')
    }
  }, [open])

  function toggleSong(song: Song) {
    setSelected(prev =>
      prev.some(s => s.id === song.id)
        ? prev.filter(s => s.id !== song.id)
        : [...prev, song]
    )
  }

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    try {
      const playlist = await createPlaylist(name, userId)
      await Promise.all(selected.map(s => addSongToPlaylist(playlist.id, s.id)))
      onCreated({ ...playlist, songCount: selected.length })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create playlist')
      setSaving(false)
    }
  }

  const selectedIds = new Set(selected.map(s => s.id))
  const filteredResults = results.filter(s => !selectedIds.has(s.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-0 p-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b">
          <DialogTitle>{t('playlist.new')}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>{t('playlist.name')}</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('playlist.namePlaceholder')}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
          </div>

          {/* Selected songs */}
          {selected.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">
                {t('playlist.selectedSongs', { count: selected.length })}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selected.map(s => (
                  <Badge key={s.id} variant="secondary" className="gap-1 pr-1">
                    {s.title}
                    <button
                      onClick={() => toggleSong(s)}
                      className="rounded-full hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Song search */}
          <div className="space-y-2">
            <Label>{t('playlist.addSongs')}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t('playlist.searchSongs')}
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>

            <div className="max-h-52 overflow-y-auto rounded-md border divide-y">
              {searching ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching…
                </div>
              ) : filteredResults.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {t('playlist.noResults')}
                </p>
              ) : (
                filteredResults.slice(0, 30).map(song => (
                  <button
                    key={song.id}
                    onClick={() => toggleSong(song)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent transition-colors"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Music2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{song.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                    </div>
                    <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))
              )}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="px-5 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('songForm.cancel')}
          </Button>
          <Button onClick={handleCreate} disabled={saving || !name.trim()}>
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{t('playlist.creating')}</>
            ) : (
              t('playlist.create')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
