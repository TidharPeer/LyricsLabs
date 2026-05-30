import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Loader2, Music } from 'lucide-react'
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
import type { YTVideo } from '@/lib/youtubeDataApi'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function YouTubeSearchDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate()
  const [artist, setArtist] = useState('')
  const [song, setSong] = useState('')
  const [results, setResults] = useState<YTVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    if (!open) return
    setArtist('')
    setSong('')
    setResults([])
    setError('')
    setSearched(false)
  }, [open])

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
    const url = `https://www.youtube.com/watch?v=${video.videoId}`
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

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Artist</Label>
            <Input
              placeholder="e.g. The Beatles"
              value={artist}
              onChange={e => setArtist(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Song title</Label>
            <Input
              placeholder="e.g. Let It Be"
              value={song}
              onChange={e => setSong(e.target.value)}
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
      </DialogContent>
    </Dialog>
  )
}
