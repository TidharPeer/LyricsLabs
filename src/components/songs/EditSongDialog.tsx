import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { saveSongRemote } from '@/lib/db'
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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
      const updated: Song = {
        ...song,
        title: title.trim(),
        artist: artist.trim(),
        language,
        youtubeUrl: youtubeUrl.trim(),
        youtubeId: youtubeId ?? '',
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit song</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              placeholder="Song title"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Artist</Label>
            <Input
              value={artist}
              onChange={e => setArtist(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              placeholder="Artist name"
            />
          </div>

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

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim() || !artist.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
