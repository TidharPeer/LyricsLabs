import { useEffect, useRef, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { useTranslation } from 'react-i18next'
import { loadYTApi } from '@/lib/youtube'
import { lyricsDir } from '@/lib/rtl'
import type { Song, LyricLine } from '@/types'

interface Props {
  song: Song
}

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`

const ActiveLine = styled.div`
  animation: ${pulse} 1.5s ease-in-out infinite;
  font-size: 1.15rem;
  font-weight: 600;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 0.08);
  border-inline-start: 3px solid hsl(var(--primary));
  border-radius: 0.25rem;
  padding: 0.5rem 0.75rem;
  transition: all 0.2s ease;
`

const InactiveLine = styled.div`
  font-size: 1rem;
  color: hsl(var(--muted-foreground));
  padding: 0.4rem 0.75rem;
  transition: all 0.2s ease;
  border-inline-start: 3px solid transparent;
  border-radius: 0.25rem;
`

function findActiveLine(lyrics: LyricLine[], currentTime: number): number {
  if (currentTime <= 0) return -1
  let active = -1
  for (let i = 0; i < lyrics.length; i++) {
    const ts = lyrics[i].timestamp
    if (ts !== undefined && ts <= currentTime) active = i
  }
  return active
}

export function KaraokeView({ song }: Props) {
  const { t } = useTranslation()
  const [currentTime, setCurrentTime] = useState(0)
  const [playerReady, setPlayerReady] = useState(false)
  const playerRef = useRef<YT.Player | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
              setCurrentTime(playerRef.current?.getCurrentTime?.() ?? 0)
            }, 250)
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
          <p className="text-sm text-muted-foreground text-center py-8">
            {t('songDetail.noTimestamps')}
          </p>
        ) : !playerReady ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t('common.loading')}
          </p>
        ) : (
          <div className="space-y-1" dir={dir}>
            {song.lyrics.map((line, i) => {
              const isActive = i === activeLine
              return isActive ? (
                <ActiveLine key={line.id} ref={activeRef as React.RefObject<HTMLDivElement>}>
                  {line.text}
                </ActiveLine>
              ) : (
                <InactiveLine key={line.id}>{line.text}</InactiveLine>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
