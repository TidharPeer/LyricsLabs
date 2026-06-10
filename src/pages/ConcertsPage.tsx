import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic2, Play, Loader2, CalendarDays, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePickerButton } from '@/components/ui/date-picker'
import { fetchConcertPlaylists, renamePlaylist, updatePlaylistConcertDate } from '@/lib/db'
import { useAuth } from '@/contexts/AuthContext'
import { format, parseISO } from 'date-fns'
import type { Playlist } from '@/types'

function concertCountdown(dateStr: string): { label: string; urgent: boolean } {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const concert = new Date(dateStr + 'T00:00:00')
  const days = Math.round((concert.getTime() - today.getTime()) / 86_400_000)
  if (days === 0) return { label: 'TODAY!!', urgent: true }
  if (days === 1) return { label: 'Tomorrow!', urgent: true }
  if (days <= 7) return { label: `In ${days} days`, urgent: true }
  return { label: `In ${days} days`, urgent: false }
}

interface ConcertCardProps {
  playlist: Playlist
  isOwner: boolean
  onUpdate: (patch: Partial<Playlist>) => void
}

function ConcertCard({ playlist, isOwner, onUpdate }: ConcertCardProps) {
  const navigate = useNavigate()
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(playlist.name)
  const inputRef = useRef<HTMLInputElement>(null)

  const { label, urgent } = concertCountdown(playlist.concertDate!)

  function startEdit() {
    setNameValue(playlist.name)
    setEditingName(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  async function commitName() {
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === playlist.name) {
      setEditingName(false)
      return
    }
    await renamePlaylist(playlist.id, trimmed).catch(() => {})
    onUpdate({ name: trimmed })
    setEditingName(false)
  }

  function cancelEdit() {
    setNameValue(playlist.name)
    setEditingName(false)
  }

  async function handleDateChange(newDate: string) {
    await updatePlaylistConcertDate(playlist.id, newDate || null).catch(() => {})
    onUpdate({ concertDate: newDate || undefined })
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Countdown strip */}
      <div className={`px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5 ${urgent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
        <Mic2 className="h-3.5 w-3.5 shrink-0" />
        {label}
      </div>

      <div className="px-4 py-3 space-y-2">
        {/* Title row */}
        {editingName ? (
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitName()
                if (e.key === 'Escape') cancelEdit()
              }}
              className="h-8 text-base font-semibold flex-1"
              autoFocus
            />
            <button onClick={commitName} className="text-green-600 hover:text-green-700 p-1 rounded">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground p-1 rounded">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-start gap-2 min-w-0">
            <h2 className="text-base font-semibold leading-snug flex-1 min-w-0 break-words">
              {playlist.name}
            </h2>
            {isOwner && (
              <button
                onClick={startEdit}
                className="text-muted-foreground hover:text-foreground p-1 rounded shrink-0 mt-0.5"
                title="Rename"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            {format(parseISO(playlist.concertDate!), 'MMMM d, yyyy')}
          </span>
          <span>·</span>
          <span>{playlist.songCount ?? 0} songs</span>
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <Button
            size="sm"
            className="gap-1.5"
            disabled={(playlist.songCount ?? 0) === 0}
            onClick={() => navigate(`/playlists/${playlist.id}/play`)}
          >
            <Play className="h-3.5 w-3.5" />
            Play & Practice
          </Button>
          {isOwner && (
            <DatePickerButton
              value={playlist.concertDate ?? ''}
              onChange={handleDateChange}
              placeholder="Change date"
              className="h-8 text-xs"
            />
          )}
        </div>
      </div>
    </div>
  )
}

export function ConcertsPage() {
  const { user } = useAuth()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchConcertPlaylists()
      .then(setPlaylists)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function handleUpdate(id: string, patch: Partial<Playlist>) {
    setPlaylists(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Mic2 className="h-6 w-6 text-primary shrink-0" />
        <div>
          <h1 className="text-2xl font-bold">Upcoming Concerts</h1>
          <p className="text-sm text-muted-foreground">Playlists with a future concert date, sorted by show date</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {error}
        </div>
      )}

      {!loading && !error && playlists.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center gap-3">
          <Mic2 className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-muted-foreground">No upcoming concerts yet.</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Import a setlist or open a playlist and set a future concert date to see it here.
          </p>
        </div>
      )}

      {!loading && playlists.length > 0 && (
        <div className="space-y-3">
          {playlists.map(pl => (
            <ConcertCard
              key={pl.id}
              playlist={pl}
              isOwner={pl.createdBy === user?.id}
              onUpdate={patch => handleUpdate(pl.id, patch)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
