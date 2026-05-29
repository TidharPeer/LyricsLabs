import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { loadYTApi } from '@/lib/youtube'
import { upsertSong } from '@/lib/storage'
import { lyricsDir } from '@/lib/rtl'
import type { Song, LyricLine } from '@/types'

interface Props {
  song: Song
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '--:--'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function useYTPlayer(songId: string, youtubeId: string) {
  const playerRef = useRef<YT.Player | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!youtubeId || !containerRef.current) return
    loadYTApi(() => {
      if (!containerRef.current) return
      try { playerRef.current?.destroy() } catch { /* ignore */ }
      const div = document.createElement('div')
      containerRef.current.innerHTML = ''
      containerRef.current.appendChild(div)
      playerRef.current = new window.YT.Player(div, {
        videoId: youtubeId,
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, modestbranding: 1 },
        events: { onReady: () => setReady(true) },
      })
    })
    return () => {
      try { playerRef.current?.destroy() } catch { /* ignore */ }
      playerRef.current = null
      setReady(false)
    }
  }, [songId, youtubeId])

  return { playerRef, containerRef, ready }
}

// ─── Live Sync Tab ────────────────────────────────────────────────────────────

function LiveSyncTab({ song, lines, setLines }: {
  song: Song
  lines: LyricLine[]
  setLines: React.Dispatch<React.SetStateAction<LyricLine[]>>
}) {
  const { t } = useTranslation()
  const { playerRef, containerRef, ready } = useYTPlayer(song.id, song.youtubeId)
  const listRef = useRef<HTMLDivElement>(null)

  // Which line to stamp next: first without a timestamp
  const nextIndex = lines.findIndex((l) => l.timestamp === undefined)
  const allDone = nextIndex === -1
  const stampedCount = lines.filter((l) => l.timestamp !== undefined).length

  function stamp() {
    const time = playerRef.current?.getCurrentTime?.() ?? 0
    const idx = nextIndex === -1 ? lines.length : nextIndex
    if (idx >= lines.length) return
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, timestamp: Math.round(time * 10) / 10 } : l))
    )
  }

  function undo() {
    // Find last stamped line
    let lastStamped = -1
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].timestamp !== undefined) { lastStamped = i; break }
    }
    if (lastStamped === -1) return

    // Seek back to 2 seconds before that stamp so user can retry
    const seekTarget = Math.max(0, (lines[lastStamped].timestamp ?? 0) - 2)
    try { playerRef.current?.seekTo(seekTarget, true) } catch { /* ignore */ }

    setLines((prev) =>
      prev.map((l, i) => (i === lastStamped ? { ...l, timestamp: undefined } : l))
    )
  }

  // Auto-scroll current line into view
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-current="true"]')
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [nextIndex])

  const dir = lyricsDir(song.language)

  return (
    <div className="space-y-4">
      {song.youtubeId ? (
        <div ref={containerRef} className="aspect-video w-full overflow-hidden rounded-lg bg-black" />
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t('timestamp.noVideo')}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {allDone
            ? t('timestamp.allStamped')
            : t('timestamp.lineProgress', { stamped: stampedCount, total: lines.length })}
        </p>
        {allDone && <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1" />{t('timestamp.allStamped')}</Badge>}
      </div>

      {/* Scrollable line list */}
      <div
        ref={listRef}
        dir={dir}
        className="rounded-lg border divide-y max-h-64 overflow-y-auto"
      >
        {lines.map((line, i) => {
          const isNext = i === nextIndex
          const isDone = line.timestamp !== undefined
          const isUpcoming = !isDone && !isNext

          return (
            <div
              key={line.id}
              data-current={isNext ? 'true' : undefined}
              className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                isNext
                  ? 'bg-primary/10 font-semibold'
                  : isDone
                  ? 'opacity-50'
                  : isUpcoming
                  ? 'text-muted-foreground'
                  : ''
              }`}
            >
              {isNext && (
                <span className="shrink-0 text-primary text-base leading-none">›</span>
              )}
              {isDone && (
                <span className="shrink-0 text-xs font-mono text-muted-foreground w-10">
                  {formatTime(line.timestamp!)}
                </span>
              )}
              {!isDone && !isNext && (
                <span className="shrink-0 w-10 text-xs text-muted-foreground text-center">—</span>
              )}
              <span className="flex-1 truncate">{line.text}</span>
            </div>
          )
        })}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={undo}
          disabled={stampedCount === 0}
          className="gap-2"
        >
          <Trash2 className="h-4 w-4" />
          {t('timestamp.undoLast')}
        </Button>

        <Button
          size="lg"
          className="flex-1 gap-2 text-base"
          onClick={stamp}
          disabled={!ready || allDone}
        >
          <Plus className="h-5 w-5" />
          {allDone ? t('timestamp.allStamped') : t('timestamp.stampNextLine')}
        </Button>
      </div>

      {!ready && song.youtubeId && (
        <p className="text-xs text-center text-muted-foreground">{t('common.loading')}</p>
      )}
    </div>
  )
}

// ─── Manual Edit Tab ──────────────────────────────────────────────────────────

function ManualEditTab({ song, lines, setLines }: {
  song: Song
  lines: LyricLine[]
  setLines: React.Dispatch<React.SetStateAction<LyricLine[]>>
}) {
  const { t } = useTranslation()
  const { playerRef, containerRef, ready } = useYTPlayer(song.id + '-manual', song.youtubeId)
  const dir = lyricsDir(song.language)

  function tapLine(index: number) {
    const time = playerRef.current?.getCurrentTime?.() ?? 0
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, timestamp: Math.round(time * 10) / 10 } : l))
    )
  }

  function clearLine(index: number) {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, timestamp: undefined } : l))
    )
  }

  function handleManualTime(index: number, value: string) {
    const num = parseFloat(value)
    setLines((prev) =>
      prev.map((l, i) =>
        i === index ? { ...l, timestamp: isNaN(num) ? undefined : num } : l
      )
    )
  }

  return (
    <div className="space-y-4">
      {song.youtubeId ? (
        <div ref={containerRef} className="aspect-video w-full overflow-hidden rounded-lg bg-black" />
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t('timestamp.noVideo')}
        </div>
      )}

      <div className="space-y-1 rounded-lg border divide-y" dir={dir}>
        {lines.map((line, i) => (
          <div key={line.id} className="flex items-center gap-2 p-2">
            <span className="text-xs text-muted-foreground w-6 shrink-0 text-center">{i + 1}</span>
            <span className="flex-1 text-sm truncate">{line.text}</span>
            <Input
              className="w-20 h-7 text-xs text-center"
              placeholder="0.0"
              value={line.timestamp !== undefined ? String(line.timestamp) : ''}
              onChange={(e) => handleManualTime(i, e.target.value)}
            />
            <span className="text-xs font-mono w-12 text-right text-muted-foreground shrink-0">
              {line.timestamp !== undefined ? formatTime(line.timestamp) : '--:--'}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs shrink-0"
              disabled={!ready}
              onClick={() => tapLine(i)}
            >
              {t('timestamp.tap')}
            </Button>
            {line.timestamp !== undefined && (
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => clearLine(i)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TimestampEditor({ song }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [lines, setLines] = useState<LyricLine[]>(() =>
    song.lyrics.map((l) => ({ ...l }))
  )
  const [saving, setSaving] = useState(false)

  function handleSave() {
    setSaving(true)
    upsertSong({ ...song, lyrics: lines })
    navigate(`/songs/${song.id}`)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{t('timestamp.title')}</h1>
          <p className="text-sm text-muted-foreground">{song.title} — {song.artist}</p>
        </div>
      </div>

      <Tabs defaultValue="live">
        <TabsList>
          <TabsTrigger value="live">{t('timestamp.liveSyncMode')}</TabsTrigger>
          <TabsTrigger value="manual">{t('timestamp.manualMode')}</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-4">
          <p className="text-sm text-muted-foreground mb-3">{t('timestamp.playThenStamp')}</p>
          <LiveSyncTab song={song} lines={lines} setLines={setLines} />
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <p className="text-sm text-muted-foreground mb-3">{t('timestamp.instructions')}</p>
          <ManualEditTab song={song} lines={lines} setLines={setLines} />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end border-t pt-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t('timestamp.saving') : t('timestamp.save')}
        </Button>
      </div>
    </div>
  )
}
