import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, Sparkles, Music } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getSong, deleteSong as localDelete, extractYouTubeId } from '@/lib/storage'
import { saveSongRemote, deleteSongRemote } from '@/lib/db'
import { fetchYouTubeMetadata, fetchLyrics, type FetchedLyrics } from '@/lib/fetchSongData'
import { useAuth } from '@/contexts/AuthContext'
import type { Song, LyricLine } from '@/types'

const LANGUAGES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'other']

type FetchStatus = 'idle' | 'loading' | 'ok' | 'error'

function parseLyricsText(raw: string): LyricLine[] {
  return raw
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0)
    .map((text) => ({ id: crypto.randomUUID(), text }))
}

function mergeLyrics(existing: LyricLine[], updated: LyricLine[]): LyricLine[] {
  return updated.map((newLine, i) => {
    const match = existing.find((e) => e.text === newLine.text)
    if (match) return match
    return existing[i] ? { ...existing[i], text: newLine.text } : newLine
  })
}

export function SongFormPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const existing = id && id !== 'new' ? getSong(id) : undefined

  // Redirect to auth if not signed in
  useEffect(() => {
    if (!user) navigate('/auth', { replace: true })
  }, [user, navigate])

  const [title, setTitle] = useState(existing?.title ?? '')
  const [artist, setArtist] = useState(existing?.artist ?? '')
  const [language, setLanguage] = useState(existing?.language ?? 'en')
  const [youtubeUrl, setYoutubeUrl] = useState(existing?.youtubeUrl ?? '')
  const [lyricsText, setLyricsText] = useState(
    existing?.lyrics.map((l) => l.text).join('\n') ?? ''
  )
  const [urlError, setUrlError] = useState('')

  // Auto-fetch state
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('idle')
  const [fetchedLyrics, setFetchedLyrics] = useState<FetchedLyrics | null>(null)
  const [lyricsImported, setLyricsImported] = useState(false)
  // Track which fields were auto-filled so we can show a badge
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastFetchedId = useRef<string>('')

  // Watch URL field: debounce, extract ID, fetch metadata + lyrics
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const videoId = extractYouTubeId(youtubeUrl)
    if (!videoId || videoId === lastFetchedId.current) return

    debounceRef.current = setTimeout(async () => {
      lastFetchedId.current = videoId
      setFetchStatus('loading')
      setFetchedLyrics(null)
      setLyricsImported(false)

      const metadata = await fetchYouTubeMetadata(videoId)
      if (!metadata) {
        setFetchStatus('error')
        return
      }

      // Auto-fill only empty fields
      const filled = new Set<string>()
      if (!title.trim()) { setTitle(metadata.title); filled.add('title') }
      if (!artist.trim()) { setArtist(metadata.artist); filled.add('artist') }
      // Always suggest detected language (user can override)
      setLanguage(metadata.language)
      filled.add('language')

      setAutoFilledFields(filled)
      setFetchStatus('ok')

      // Now try to fetch lyrics in the background
      const lyrics = await fetchLyrics(metadata.artist || artist, metadata.title || title)
      setFetchedLyrics(lyrics)
    }, 700)
  }, [youtubeUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  function importLyrics() {
    if (!fetchedLyrics) return
    if (lyricsText.trim() && !window.confirm(t('songForm.lyricsReplaceWarning'))) return
    setLyricsText(fetchedLyrics.lines.map((l) => l.text).join('\n'))
    setLyricsImported(true)
  }

  async function handleSave() {
    setUrlError('')
    const youtubeId = extractYouTubeId(youtubeUrl)
    if (youtubeUrl && !youtubeId) {
      setUrlError(t('songForm.invalidUrl'))
      return
    }

    // If synced lyrics were imported, use them directly (with timestamps)
    let lyrics: LyricLine[]
    if (lyricsImported && fetchedLyrics?.synced) {
      lyrics = fetchedLyrics.lines
    } else if (existing?.lyrics) {
      lyrics = mergeLyrics(existing.lyrics, parseLyricsText(lyricsText))
    } else {
      lyrics = parseLyricsText(lyricsText)
    }

    const song: Song = {
      id: existing?.id ?? crypto.randomUUID(),
      title: title.trim(),
      artist: artist.trim(),
      language,
      youtubeUrl: youtubeUrl.trim(),
      youtubeId,
      lyrics,
      createdAt: existing?.createdAt ?? Date.now(),
    }

    if (user) {
      const saved = await saveSongRemote(song, user.id)
      navigate(`/songs/${saved.id}`)
    } else {
      navigate('/auth')
    }
  }

  async function handleDelete() {
    if (!existing) return
    if (window.confirm(t('songForm.deleteConfirm'))) {
      await deleteSongRemote(existing.id)
      localDelete(existing.id)
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

      {/* YouTube URL — first, because it drives auto-fill */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            {t('song.youtubeUrl')}
            {fetchStatus === 'loading' && (
              <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t('songForm.fetching')}
              </span>
            )}
            {fetchStatus === 'ok' && (
              <span className="flex items-center gap-1.5 text-xs font-normal text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t('songForm.fetchOk')}
              </span>
            )}
            {fetchStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5" />
                {t('songForm.fetchFail')}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input
            value={youtubeUrl}
            onChange={(e) => { setYoutubeUrl(e.target.value); setFetchStatus('idle') }}
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <p className="text-xs text-muted-foreground">{t('songForm.urlHelp')}</p>
          {urlError && <p className="text-xs text-destructive">{urlError}</p>}
        </CardContent>
      </Card>

      {/* Song details — auto-filled after URL fetch */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {t('song.title')} &amp; {t('song.artist')}
            {autoFilledFields.size > 0 && (
              <Badge variant="secondary" className="gap-1 font-normal text-xs">
                <Sparkles className="h-3 w-3" />
                {t('songForm.autoFilled')}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('song.title')}</Label>
            <Input
              value={title}
              onChange={(e) => { setTitle(e.target.value); setAutoFilledFields((s) => { const n = new Set(s); n.delete('title'); return n }) }}
              placeholder="Song title"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('song.artist')}</Label>
            <Input
              value={artist}
              onChange={(e) => { setArtist(e.target.value); setAutoFilledFields((s) => { const n = new Set(s); n.delete('artist'); return n }) }}
              placeholder="Artist name"
            />
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

      {/* Lyrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('song.lyrics')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Lyrics fetch result banner */}
          {fetchStatus === 'ok' && fetchedLyrics && !lyricsImported && (
            <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm text-green-800">
                <Music className="h-4 w-4 shrink-0" />
                <span>
                  {fetchedLyrics.synced
                    ? t('songForm.lyricsFoundSynced', { count: fetchedLyrics.lines.length })
                    : t('songForm.lyricsFound', { count: fetchedLyrics.lines.length })}
                </span>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs shrink-0 border-green-300 text-green-700 hover:bg-green-100" onClick={importLyrics}>
                {fetchedLyrics.synced
                  ? t('songForm.importLyricsSynced')
                  : t('songForm.importLyrics')}
              </Button>
            </div>
          )}

          {fetchStatus === 'ok' && !fetchedLyrics && (
            <p className="text-xs text-muted-foreground">{t('songForm.lyricsNotFound')}</p>
          )}

          {lyricsImported && fetchedLyrics?.synced && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              {t('songForm.lyricsImported')} Timestamps are included — karaoke sync is ready!
            </div>
          )}

          {lyricsImported && fetchedLyrics && !fetchedLyrics.synced && (
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
              {t('songForm.lyricsImported')}
            </div>
          )}

          <Textarea
            value={lyricsText}
            onChange={(e) => { setLyricsText(e.target.value); setLyricsImported(false) }}
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
