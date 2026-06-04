import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Search, Trash2, X, Plus, Loader2, Music2, Play, GripVertical, Shuffle, CheckCircle2 } from 'lucide-react'
import {
  DndContext, closestCenter,
  KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  fetchPlaylistSongs, removeSongFromPlaylist, addSongToPlaylist,
  searchSongs, fetchSongs, updatePlaylistSongOrder,
} from '@/lib/db'
import type { Song, Playlist } from '@/types'

interface Props {
  playlist: Playlist
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: (id: string) => void
  onSongCountChange: (id: string, count: number) => void
  userId?: string
}

interface SortableRowProps {
  song: Song
  index: number
  onRemove: (id: string) => void
  onNavigate: (index: number) => void
}

function SortableSongRow({ song, index, onRemove, onNavigate }: SortableRowProps) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: song.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 px-5 py-3 hover:bg-accent/50 group/row cursor-pointer ${isDragging ? 'opacity-50 bg-accent/30 z-10' : ''}`}
      onClick={() => onNavigate(index)}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={e => e.stopPropagation()}
        className="cursor-grab active:cursor-grabbing shrink-0 touch-none text-muted-foreground opacity-0 group-hover/row:opacity-100 transition-opacity"
        tabIndex={-1}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Music2 className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{song.title}</p>
        <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
      </div>
      <Badge variant="secondary" className="hidden sm:flex shrink-0 text-xs">
        {t(`languages.${song.language}`, song.language)}
      </Badge>
      {song.lyrics.some(l => l.timestamp !== undefined) && (
        <span title="Synced" className="shrink-0 flex">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        </span>
      )}
      <button
        onClick={e => { e.stopPropagation(); onRemove(song.id) }}
        className="hidden group-hover/row:flex rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
        title={t('playlist.removeFromPlaylist')}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

function ReadonlySongRow({ song, index, onNavigate }: { song: Song; index: number; onNavigate: (index: number) => void }) {
  const { t } = useTranslation()
  return (
    <div
      className="flex items-center gap-3 px-5 py-3 hover:bg-accent/50 cursor-pointer"
      onClick={() => onNavigate(index)}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Music2 className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{song.title}</p>
        <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
      </div>
      <Badge variant="secondary" className="hidden sm:flex shrink-0 text-xs">
        {t(`languages.${song.language}`, song.language)}
      </Badge>
      {song.lyrics.some(l => l.timestamp !== undefined) && (
        <span title="Synced" className="shrink-0 flex">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        </span>
      )}
    </div>
  )
}

export function PlaylistDetailDialog({ playlist, open, onOpenChange, onDelete, onSongCountChange, userId }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isOwner = !userId || userId === playlist.createdBy
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Song[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  )

  const loadSongs = useCallback(async () => {
    setLoading(true)
    try {
      setSongs(await fetchPlaylistSongs(playlist.id))
    } finally {
      setLoading(false)
    }
  }, [playlist.id])

  useEffect(() => {
    if (open) {
      loadSongs()
      setQuery('')
      setShowSearch(false)
      setShuffle(false)
    }
  }, [open, loadSongs])

  function handleSongNavigate(index: number) {
    onOpenChange(false)
    const params = new URLSearchParams({ start: String(index) })
    if (shuffle) params.set('shuffle', '1')
    navigate(`/playlists/${playlist.id}/play?${params.toString()}`)
  }

  const search = useCallback(async (q: string) => {
    setSearching(true)
    try {
      setResults(q.length >= 2 ? await searchSongs(q) : await fetchSongs())
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (!showSearch) return
    const timer = setTimeout(() => search(query), query ? 400 : 0)
    return () => clearTimeout(timer)
  }, [query, showSearch, search])

  async function handleRemove(songId: string) {
    await removeSongFromPlaylist(playlist.id, songId)
    const updated = songs.filter(s => s.id !== songId)
    setSongs(updated)
    onSongCountChange(playlist.id, updated.length)
  }

  async function handleAdd(song: Song) {
    if (songs.some(s => s.id === song.id)) return
    await addSongToPlaylist(playlist.id, song.id, songs.length)
    const updated = [...songs, song]
    setSongs(updated)
    onSongCountChange(playlist.id, updated.length)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = songs.findIndex(s => s.id === active.id)
    const newIdx = songs.findIndex(s => s.id === over.id)
    const reordered = arrayMove(songs, oldIdx, newIdx)
    setSongs(reordered)
    updatePlaylistSongOrder(playlist.id, reordered.map(s => s.id))
  }

  const playlistSongIds = new Set(songs.map(s => s.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-0 p-0">
        {/* Header */}
        <DialogHeader className="pl-5 pr-12 pt-5 pb-4 border-b">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate">{playlist.name}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t('playlist.songCount', { count: songs.length })}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {songs.length > 0 && (
                <Button
                  variant={shuffle ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1.5 h-8 text-xs"
                  onClick={() => setShuffle(v => !v)}
                  title={shuffle ? 'Shuffle on' : 'Shuffle off'}
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Shuffle</span>
                </Button>
              )}
              {songs.length > 0 && (
                <Button
                  size="sm"
                  className="gap-1.5 h-8 text-xs"
                  onClick={() => {
                    onOpenChange(false)
                    const params = new URLSearchParams()
                    if (shuffle) params.set('shuffle', '1')
                    const qs = params.toString()
                    navigate(`/playlists/${playlist.id}/play${qs ? `?${qs}` : ''}`)
                  }}
                >
                  <Play className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Play</span>
                </Button>
              )}
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8 text-xs"
                  onClick={() => setShowSearch(v => !v)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t('playlist.addSongs')}</span>
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : songs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No songs yet.
            </p>
          ) : isOwner ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} autoScroll>
              <SortableContext items={songs.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className="divide-y">
                  {songs.map((song, i) => (
                    <SortableSongRow key={song.id} song={song} index={i} onRemove={handleRemove} onNavigate={handleSongNavigate} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="divide-y">
              {songs.map((song, i) => (
                <ReadonlySongRow key={song.id} song={song} index={i} onNavigate={handleSongNavigate} />
              ))}
            </div>
          )}

          {/* Add songs search panel */}
          {isOwner && showSearch && (
            <div className="px-5 py-4 border-t space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={t('playlist.searchSongs')}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
                {searching ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : results.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    {t('playlist.noResults')}
                  </p>
                ) : (
                  results.slice(0, 20).map(song => {
                    const inPlaylist = playlistSongIds.has(song.id)
                    return (
                      <button
                        key={song.id}
                        disabled={inPlaylist}
                        onClick={() => handleAdd(song)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent disabled:opacity-50 disabled:cursor-default transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{song.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                        </div>
                        {song.lyrics.some(l => l.timestamp !== undefined) && (
                          <span title="Synced" className="shrink-0 flex">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          </span>
                        )}
                        {inPlaylist ? (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {t('playlist.alreadyAdded')}
                          </span>
                        ) : (
                          <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer — Delete (owner only, kept far from the X close button) */}
        {isOwner && (
          <div className="border-t px-5 py-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (window.confirm(t('playlist.deleteConfirm'))) {
                  onDelete(playlist.id)
                  onOpenChange(false)
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('playlist.deletePlaylist')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
