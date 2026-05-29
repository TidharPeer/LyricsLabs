import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSong, upsertSong, deleteSong, extractYouTubeId } from '@/lib/storage'
import type { Song, LyricLine } from '@/types'

const LANGUAGES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'ar', 'other']

function parseLyrics(raw: string): LyricLine[] {
  return raw
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .map((text) => ({ id: crypto.randomUUID(), text }))
}

export function SongFormPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const existing = id && id !== 'new' ? getSong(id) : undefined

  const [title, setTitle] = useState(existing?.title ?? '')
  const [artist, setArtist] = useState(existing?.artist ?? '')
  const [language, setLanguage] = useState(existing?.language ?? 'en')
  const [youtubeUrl, setYoutubeUrl] = useState(existing?.youtubeUrl ?? '')
  const [lyricsText, setLyricsText] = useState(
    existing?.lyrics.map((l) => l.text).join('\n') ?? ''
  )
  const [urlError, setUrlError] = useState('')

  function handleSave() {
    setUrlError('')
    const youtubeId = extractYouTubeId(youtubeUrl)
    if (youtubeUrl && !youtubeId) {
      setUrlError(t('songForm.invalidUrl'))
      return
    }

    const song: Song = {
      id: existing?.id ?? crypto.randomUUID(),
      title: title.trim(),
      artist: artist.trim(),
      language,
      youtubeUrl: youtubeUrl.trim(),
      youtubeId,
      lyrics: existing?.lyrics
        ? mergeLyrics(existing.lyrics, parseLyrics(lyricsText))
        : parseLyrics(lyricsText),
      createdAt: existing?.createdAt ?? Date.now(),
    }

    upsertSong(song)
    navigate(`/songs/${song.id}`)
  }

  function handleDelete() {
    if (!existing) return
    if (window.confirm(t('songForm.deleteConfirm'))) {
      deleteSong(existing.id)
      navigate('/')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">
          {existing ? t('songForm.editTitle') : t('songForm.addTitle')}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('song.title')} & {t('song.artist')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('song.title')}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Song title" />
          </div>
          <div className="space-y-1.5">
            <Label>{t('song.artist')}</Label>
            <Input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist name" />
          </div>
          <div className="space-y-1.5">
            <Label>{t('song.language')}</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {t(`languages.${lang}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('song.youtubeUrl')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <p className="text-xs text-muted-foreground">{t('songForm.urlHelp')}</p>
          {urlError && <p className="text-xs text-destructive">{urlError}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('song.lyrics')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={lyricsText}
            onChange={(e) => setLyricsText(e.target.value)}
            placeholder={t('song.lyricsPlaceholder')}
            className="min-h-[200px] font-mono text-sm"
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        {existing && (
          <Button variant="destructive" onClick={handleDelete}>
            {t('songForm.delete')}
          </Button>
        )}
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" onClick={() => navigate(-1)}>
            {t('songForm.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {t('songForm.save')}
          </Button>
        </div>
      </div>
    </div>
  )
}

function mergeLyrics(existing: LyricLine[], updated: LyricLine[]): LyricLine[] {
  return updated.map((newLine, i) => {
    const match = existing.find((e) => e.text === newLine.text)
    if (match) return match
    return existing[i]
      ? { ...existing[i], text: newLine.text }
      : newLine
  })
}
