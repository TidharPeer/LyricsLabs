import { useEffect, useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mic2, Play, Loader2, CalendarDays, Pencil, Check, X, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePickerButton } from '@/components/ui/date-picker'
import { fetchConcertPlaylists, fetchPastConcertPlaylists, renamePlaylist, updatePlaylistConcertDate } from '@/lib/db'
import { useAuth } from '@/contexts/AuthContext'
import { format, parseISO } from 'date-fns'
import { derivePlaylistNameFromDate } from '@/lib/utils'
import type { Playlist } from '@/types'

const PAGE_SIZE = 10

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
  past: boolean
  onUpdate: (patch: Partial<Playlist>) => void
}

function ConcertCard({ playlist, isOwner, past, onUpdate }: ConcertCardProps) {
  const navigate = useNavigate()
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(playlist.name)
  const inputRef = useRef<HTMLInputElement>(null)

  const countdown = past ? null : concertCountdown(playlist.concertDate!)

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
    let newName: string | undefined
    if (newDate) {
      const label = format(parseISO(newDate), 'MMM d, yyyy')
      newName = derivePlaylistNameFromDate(playlist.name, label) ?? undefined
    }
    onUpdate({ concertDate: newDate || undefined, ...(newName ? { name: newName } : {}) })
    await updatePlaylistConcertDate(playlist.id, newDate || null).catch(e => console.error('concert date update failed:', e))
    if (newName) await renamePlaylist(playlist.id, newName).catch(e => console.error('playlist rename failed:', e))
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Countdown strip */}
      {countdown && (
        <div className={`px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5 ${countdown.urgent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          <Mic2 className="h-3.5 w-3.5 shrink-0" />
          {countdown.label}
        </div>
      )}

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
          <div className="group/title flex items-center gap-1.5 min-w-0">
            <h2 className="text-base font-semibold leading-snug min-w-0 break-words">
              {playlist.name}
            </h2>
            {isOwner && (
              <button
                onClick={startEdit}
                className="opacity-0 group-hover/title:opacity-100 text-muted-foreground hover:text-foreground p-0.5 rounded shrink-0 transition-opacity"
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

interface ConcertsPageProps {
  past?: boolean
}

export function ConcertsPage({ past = false }: ConcertsPageProps) {
  const { user } = useAuth()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const fetch = past ? fetchPastConcertPlaylists : fetchConcertPlaylists
    fetch()
      .then(setPlaylists)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [past])

  // Reset to page 1 when search changes
  useEffect(() => { setPage(1) }, [search])

  const filtered = playlists.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleUpdate(id: string, patch: Partial<Playlist>) {
    setPlaylists(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Mic2 className="h-6 w-6 text-primary shrink-0" />
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold">{past ? 'Past Concerts' : 'Upcoming Concerts'}</h1>
            {!past && (
              <Link
                to="/concerts/past"
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Past concerts
              </Link>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {past
              ? 'Playlists with a concert date that has already passed'
              : 'Playlists with a future concert date, sorted by show date'}
          </p>
        </div>
      </div>

      {!past && (
        <p className="text-xs text-muted-foreground border rounded-lg px-3 py-2 bg-muted/30">
          These playlists are built from <strong>previous concert setlists</strong>. There's no guarantee the same songs will be played at the actual live show — setlists change every night.
        </p>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search concerts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
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

      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center gap-3">
          <Mic2 className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-muted-foreground">
            {search ? 'No concerts match your search.' : past ? 'No past concerts yet.' : 'No upcoming concerts yet.'}
          </p>
          {!search && !past && (
            <p className="text-sm text-muted-foreground max-w-xs">
              Import a setlist or open a playlist and set a future concert date to see it here.
            </p>
          )}
        </div>
      )}

      {!loading && paged.length > 0 && (
        <div className="space-y-3">
          {paged.map(pl => (
            <ConcertCard
              key={pl.id}
              playlist={pl}
              isOwner={pl.createdBy === user?.id}
              past={past}
              onUpdate={patch => handleUpdate(pl.id, patch)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
