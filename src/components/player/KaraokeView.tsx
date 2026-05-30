import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { loadYTApi } from '@/lib/youtube'
import { Button } from '@/components/ui/button'
import { lyricsDir } from '@/lib/rtl'
import { addStars } from '@/lib/db'
import { findActiveLine } from '@/lib/activeLine'
import { ActiveLyricLine, InactiveLyricLine } from '@/styles/lyricLine'
import type { Song } from '@/types'

interface Props {
  song: Song
  userId?: string
  onStarEarned?: () => void
  onEnded?: () => void
}

export function KaraokeView({ song, userId, onStarEarned, onEnded }: Props) {
  const { t } = useTranslation()
  const [currentTime, setCurrentTime] = useState(0)
  const [playerReady, setPlayerReady] = useState(false)
  const playerRef = useRef<YT.Player | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const karaokeStarGiven = useRef(false)
  // Always call latest onEnded without re-creating the YT player
  const onEndedRef = useRef(onEnded)
  useEffect(() => { onEndedRef.current = onEnded }, [onEnded])

  const hasTimestamps = song.lyrics.some((l) => l.timestamp !== undefined)
  const activeLine = findActiveLine(song.lyrics, currentTime)
  const dir = lyricsDir(song.language)

  useEffect(() => {
    if (!song.youtubeId || !containerRef.current) return

    loadYTApi(() => {
      if (!containerRef.current) return
      try { playerRef.current?.destroy() } catch { /* ignore */ }

      const div = document.createElement('div')
      containerRef.current.innerHTML = ''
      containerRef.current.appendChild(div)

      playerRef.current = new window.YT.Player(div, {
        videoId: song.youtubeId,
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            setPlayerReady(true)
            intervalRef.current = setInterval(() => {
              const t = playerRef.current?.getCurrentTime?.() ?? 0
              setCurrentTime(t)
              if (!karaokeStarGiven.current && t >= 30 && userId) {
                karaokeStarGiven.current = true
                addStars(userId, 1).then(() => onStarEarned?.()).catch(() => {})
              }
            }, 250)
          },
          onStateChange: (event: YT.OnStateChangeEvent) => {
            if (event.data === 0 /* YT.PlayerState.ENDED */) {
              onEndedRef.current?.()
            }
          },
        },
      })
    })

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      try { playerRef.current?.destroy() } catch { /* ignore */ }
      playerRef.current = null
      setPlayerReady(false)
    }
  }, [song.id, song.youtubeId])

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeLine])

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div
        ref={containerRef}
        className="aspect-video w-full overflow-hidden rounded-lg bg-black"
      />

      <div className="rounded-lg border bg-card p-4 overflow-y-auto max-h-[56vw] lg:max-h-none lg:h-[360px]">
        {!hasTimestamps ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-sm text-muted-foreground text-center">
              {t('songDetail.noTimestamps')}
            </p>
            {userId && (!song.createdBy || userId === song.createdBy) && (
              <Button asChild variant="outline">
                <Link to={`/songs/${song.id}/timestamps`}>Add Timestamps</Link>
              </Button>
            )}
          </div>
        ) : !playerReady ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t('common.loading')}
          </p>
        ) : (
          <div className="space-y-1" dir={dir}>
            {song.lyrics.map((line, i) => {
              const isActive = i === activeLine
              return isActive ? (
                <ActiveLyricLine key={line.id} ref={activeRef as React.RefObject<HTMLDivElement>}>
                  {line.text}
                </ActiveLyricLine>
              ) : (
                <InactiveLyricLine key={line.id}>{line.text}</InactiveLyricLine>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
