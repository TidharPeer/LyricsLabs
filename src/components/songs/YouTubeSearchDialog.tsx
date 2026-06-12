import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Search, Loader2, Music, LogIn } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { searchVideos } from '@/lib/youtubeDataApi'
import { useAuth } from '@/contexts/AuthContext'
import type { YTVideo } from '@/lib/youtubeDataApi'

const GUEST_KEY = 'llabs_guest_add_used'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialSong?: string
}

export function YouTubeSearchDialog({ open, onOpenChange, initialSong }: Props) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [artist, setArtist] = useState('')
  const [song, setSong] = useState('')
  const songInputRef = useRef<HTMLInputElement>(null)
  const [results, setResults] = useState<YTVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [guestBlocked, setGuestBlocked] = useState(false)

  useEffect(() => {
    if (!open) return
    setArtist('')
    setSong(initialSong ?? '')
    setResults([])
    setError('')
    setSearched(false)
    setGuestBlocked(!user && !!localStorage.getItem(GUEST_KEY))
    // Focus and move cursor to end so user can keep typing
    setTimeout(() => {
      const el = songInputRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }, 0)
  }, [open, user, initialSong])

  async function handleSearch() {
    const query = [artist.trim(), song.trim()].filter(Boolean).join(' ')
    if (!query) return
    setLoading(true)
    setError('')
    setResults([])
    setSearched(true)
    try {
      const videos = await searchVideos(query, 10)
      setResults(videos)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  function handleSelect(video: YTVideo) {
    if (!user && localStorage.getItem(GUEST_KEY)) {
      setGuestBlocked(true)
      return
    }
    const url = `https://www.youtube.com/watch?v=${video.videoId}`
    if (!user) localStorage.setItem(GUEST_KEY, '1')
    onOpenChange(false)
    navigate(`/songs/new?url=${encodeURIComponent(url)}`)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Song</DialogTitle>
        </DialogHeader>

        {guestBlocked ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <LogIn className="h-10 w-10 text-muted-foreground/50" />
            <div>
              <p className="font-medium">Sign in to add more songs</p>
              <p className="text-sm text-muted-foreground mt-1">
                You've already added a song as a guest. Create a free account to keep going.
              </p>
            </div>
            <Button asChild>
              <Link to="/auth">Sign in / Sign up</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Song title</Label>
                <Input
                  ref={songInputRef}
                  placeholder="e.g. Let It Be"
                  value={song}
                  onChange={e => setSong(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Artist</Label>
                <Input
                  placeholder="e.g. The Beatles"
                  value={artist}
                  onChange={e => setArtist(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={loading || (!artist.trim() && !song.trim())}
                className="w-full"
              >
                {loading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Search className="h-4 w-4" />}
                Search YouTube
              </Button>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {searched && !loading && results.length === 0 && !error && (
              <p className="text-sm text-muted-foreground text-center py-2">No results found</p>
            )}

            {results.length > 0 && (
              <div className="space-y-1.5 max-h-80 overflow-y-auto -mx-1 px-1">
                {results.map(video => (
                  <button
                    key={video.videoId}
                    onClick={() => handleSelect(video)}
                    className="flex w-full items-center gap-3 rounded-lg border p-2.5 text-left hover:bg-accent transition-colors"
                  >
                    {video.thumbnail ? (
                      <img src={video.thumbnail} alt="" className="h-14 w-20 rounded object-cover shrink-0" />
                    ) : (
                      <div className="h-14 w-20 rounded bg-muted shrink-0 flex items-center justify-center">
                        <Music className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium line-clamp-2">{video.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{video.channelTitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
