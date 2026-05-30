import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { saveSongRemote } from '@/lib/db'
import { fetchLyrics, parsePlain } from '@/lib/fetchSongData'
import { extractYouTubeId } from '@/lib/storage'
import type { Song } from '@/types'

const LANGUAGES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'other']

interface Props {
  song: Song
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (updated: Song) => void
  userId: string
}

export function EditSongDialog({ song, open, onOpenChange, onSaved, userId }: Props) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(song.title)
  const [artist, setArtist] = useState(song.artist)
  const [language, setLanguage] = useState(song.language)
  const [youtubeUrl, setYoutubeUrl] = useState(song.youtubeUrl)
  const [lyricsText, setLyricsText] = useState(() => song.lyrics.map(l => l.text).join('\n'))
  const [lyricsLoading, setLyricsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const originalLyricsText = song.lyrics.map(l => l.text).join('\n')

  // Auto-fetch lyrics on open when song has none
  useEffect(() => {
    if (song.lyrics.length > 0 || !song.title || !song.artist) return
    setLyricsLoading(true)
    fetchLyrics(song.artist, song.title)
      .then(result => {
        if (result) setLyricsText(result.lines.map(l => l.text).join('\n'))
      })
      .finally(() => setLyricsLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!title.trim() || !artist.trim()) return
    const youtubeId = extractYouTubeId(youtubeUrl.trim())
    if (youtubeUrl.trim() && !youtubeId) {
      setError('Invalid YouTube URL')
      return
    }
    setSaving(true)
    setError('')
    try {
      // Preserve original lyrics (with timestamps) if text wasn't changed
      const lyricsChanged = lyricsText.trim() !== originalLyricsText.trim()
      const lyrics = (!lyricsChanged && song.lyrics.length > 0)
        ? song.lyrics
        : parsePlain(lyricsText)

      const updated: Song = {
        ...song,
        title: title.trim(),
        artist: artist.trim(),
        language,
        youtubeUrl: youtubeUrl.trim(),
        youtubeId: youtubeId ?? '',
        lyrics,
      }
      await saveSongRemote(updated, userId)
      onSaved(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col">
        <DialogHeader>
          <DialogTitle>Edit song</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-1 pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Song title"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Artist</Label>
              <Input
                value={artist}
                onChange={e => setArtist(e.target.value)}
                placeholder="Artist name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(l => (
                    <SelectItem key={l} value={l}>{t(`languages.${l}`, l)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>YouTube URL</Label>
              <Input
                value={youtubeUrl}
                onChange={e => { setYoutubeUrl(e.target.value); setError('') }}
                placeholder="https://youtube.com/watch?v=…"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Lyrics</Label>
              {lyricsLoading && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Fetching lyrics…
                </span>
              )}
            </div>
            <Textarea
              value={lyricsText}
              onChange={e => setLyricsText(e.target.value)}
              placeholder="Paste lyrics here, one line per row…"
              className="min-h-48 resize-y font-mono text-sm"
              disabled={lyricsLoading}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="border-t pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim() || !artist.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
