import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, ListMusic, Trash2, Loader2, Play, Share2, Mic2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreatePlaylistDialog } from './CreatePlaylistDialog'
import { PlaylistDetailDialog } from './PlaylistDetailDialog'
import { fetchPlaylists, deletePlaylist } from '@/lib/db'
import type { Playlist } from '@/types'

function concertCountdown(dateStr: string): { label: string; urgent: boolean } {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const concert = new Date(dateStr + 'T00:00:00')
  const days = Math.round((concert.getTime() - today.getTime()) / 86_400_000)
  if (days < 0) return { label: `${Math.abs(days)}d ago`, urgent: false }
  if (days === 0) return { label: 'Today!!', urgent: true }
  if (days === 1) return { label: 'Tomorrow!', urgent: true }
  return { label: `In ${days} days`, urgent: days <= 7 }
}

interface Props {
  userId: string
}

export function PlaylistsView({ userId }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<Playlist | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setPlaylists(await fetchPlaylists(userId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load playlists')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  function handleCreated(playlist: Playlist) {
    setPlaylists(prev => [playlist, ...prev])
  }

  async function handleDelete(id: string) {
    try {
      await deletePlaylist(id)
      setPlaylists(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete playlist')
    }
  }

  function handleShare(e: React.MouseEvent, pl: Playlist) {
    e.stopPropagation()
    const url = `${window.location.origin}/api/share?id=${pl.id}`
    if (navigator.share) {
      navigator.share({ title: pl.name, url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url).catch(() => {})
    }
  }

  function handleSongCountChange(id: string, count: number) {
    setPlaylists(prev =>
      prev.map(p => p.id === id ? { ...p, songCount: count } : p)
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('playlist.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? '…' : t('playlist.playlistCount', { count: playlists.length })}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('playlist.new')}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : playlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <ListMusic className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground mb-4">{t('playlist.empty')}</p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            {t('playlist.new')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {playlists.map(pl => (
            <Card
              key={pl.id}
              className="cursor-pointer transition-colors hover:bg-muted/50 group min-w-0"
              onClick={() => setSelected(pl)}
            >
              <CardContent className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <ListMusic className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{pl.name}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm text-muted-foreground truncate">
                      {t('playlist.songCount', { count: pl.songCount ?? 0 })}
                    </p>
                    {pl.concertDate && (() => {
                      const { label, urgent } = concertCountdown(pl.concertDate)
                      return (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${urgent ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          <Mic2 className="h-3 w-3" />{label}
                        </span>
                      )
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <Badge variant="outline" className="hidden sm:flex text-xs">
                    {t('playlist.songCount', { count: pl.songCount ?? 0 })}
                  </Badge>
                  {(pl.songCount ?? 0) > 0 && (
                    <Button
                      size="sm"
                      className="gap-1 sm:gap-1.5 px-2 sm:px-3"
                      onClick={e => { e.stopPropagation(); navigate(`/playlists/${pl.id}/play`) }}
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Play</span>
                    </Button>
                  )}
                  <button
                    onClick={e => handleShare(e, pl)}
                    className="hidden group-hover:flex rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    title="Share playlist"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      if (window.confirm(t('playlist.deleteConfirm'))) handleDelete(pl.id)
                    }}
                    className="hidden group-hover:flex rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title={t('playlist.deletePlaylist')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreatePlaylistDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        userId={userId}
        onCreated={handleCreated}
      />

      {selected && (
        <PlaylistDetailDialog
          playlist={selected}
          open={true}
          onOpenChange={open => { if (!open) setSelected(null) }}
          onDelete={id => {
            handleDelete(id)
            setSelected(null)
          }}
          onSongCountChange={handleSongCountChange}
          userId={userId}
        />
      )}
    </div>
  )
}
