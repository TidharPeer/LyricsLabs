import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ListPlus, Check, Plus, Loader2 } from 'lucide-react'
import { fetchPlaylists, getSongPlaylistIds, addSongToPlaylist } from '@/lib/db'
import type { Playlist } from '@/types'

interface Props {
  songId: string
  userId: string
}

export function AddToPlaylistButton({ songId, userId }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function handleOpen(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setOpen(true)
    setLoading(true)
    try {
      const [pls, ids] = await Promise.all([
        fetchPlaylists(userId),
        getSongPlaylistIds(songId, userId),
      ])
      setPlaylists(pls)
      setMemberIds(new Set(ids))
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e: React.MouseEvent, playlistId: string) {
    e.preventDefault()
    e.stopPropagation()
    if (memberIds.has(playlistId)) return
    setAdding(playlistId)
    try {
      await addSongToPlaylist(playlistId, songId)
      setMemberIds(prev => new Set([...prev, playlistId]))
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="hidden group-hover:flex rounded p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
        title={t('playlist.addToPlaylist')}
        aria-label={t('playlist.addToPlaylist')}
      >
        <ListPlus className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-44 rounded-md border bg-background shadow-lg">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-3 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading…
            </div>
          ) : playlists.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">{t('playlist.noPlaylists')}</p>
          ) : (
            <div className="p-1">
              {playlists.map(pl => {
                const isMember = memberIds.has(pl.id)
                const isAdding = adding === pl.id
                return (
                  <button
                    key={pl.id}
                    disabled={isMember || isAdding}
                    onClick={e => handleAdd(e, pl.id)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent disabled:cursor-default disabled:opacity-60 transition-colors"
                  >
                    {isAdding ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                    ) : isMember ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="truncate">{pl.name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
