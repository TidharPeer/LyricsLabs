import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { loadYTApi } from '@/lib/youtube'
import { Button } from '@/components/ui/button'
import { lyricsDir } from '@/lib/rtl'
import { addStars, incrementPlayCount } from '@/lib/db'
import { findActiveLine } from '@/lib/activeLine'
import { ActiveLyricLine, InactiveLyricLine } from '@/styles/lyricLine'
import { getDailyChallenge, setDailyChallengeComplete } from '@/lib/storage'
import { useMediaSession } from '@/hooks/useMediaSession'
import type { Song } from '@/types'

interface Props {
  song: Song
  userId?: string
  onStarEarned?: () => void
  onEnded?: () => void
  autoplay?: boolean
}

export function KaraokeView({ song, userId, onStarEarned, onEnded, autoplay }: Props) {
  const { t } = useTranslation()
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const [isInstrumental, setIsInstrumental] = useState(false)
  const playerRef = useRef<YT.Player | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const karaokeStarGiven = useRef(false)
  const playCountGiven = useRef(false)
  const dailyChallengeGiven = useRef(false)
  // Always call latest onEnded without re-creating the YT player
  const onEndedRef = useRef(onEnded)
  useEffect(() => { onEndedRef.current = onEnded }, [onEnded])

  const hasTimestamps = song.lyrics.some((l) => l.timestamp !== undefined)
  const activeLine = findActiveLine(song.lyrics, currentTime)
  const dir = lyricsDir(song.language)

  useMediaSession({
    title: song.title,
    artist: song.artist,
    youtubeId: song.youtubeId,
    playing,
    currentTime,
    duration,
    onPlay: () => playerRef.current?.playVideo(),
    onPause: () => playerRef.current?.pauseVideo(),
    onSeek: (t) => playerRef.current?.seekTo(t, true),
  })

  function toggleVocals() {
    const player = playerRef.current as any
    if (!player || !song.instrumentalYoutubeId) return
    const time = player.getCurrentTime?.() ?? 0
    const isPlaying = player.getPlayerState?.() === 1
    const newId = isInstrumental ? song.youtubeId : song.instrumentalYoutubeId
    if (isPlaying) {
      player.loadVideoById({ videoId: newId, startSeconds: time })
    } else {
      player.cueVideoById({ videoId: newId, startSeconds: time })
    }
    setIsInstrumental(prev => !prev)
  }

  useEffect(() => {
    setIsInstrumental(false)
    playCountGiven.current = false
    karaokeStarGiven.current = false
    dailyChallengeGiven.current = false
  }, [song.id])

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
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => {
            setPlayerReady(true)
            if (autoplay) playerRef.current?.playVideo()
            intervalRef.current = setInterval(() => {
              const t = playerRef.current?.getCurrentTime?.() ?? 0
              const dur = (playerRef.current as any)?.getDuration?.() ?? 0
              setCurrentTime(t)
              if (dur > 0) setDuration(dur)
              if (!playCountGiven.current && t >= 5) {
                playCountGiven.current = true
                incrementPlayCount(song.id).catch(() => {})
              }
              if (!karaokeStarGiven.current && t >= 30 && userId) {
                karaokeStarGiven.current = true
                addStars(userId, 1).then(() => onStarEarned?.()).catch(() => {})
              }
              if (!dailyChallengeGiven.current && dur > 0 && t >= 0.5 * dur && userId) {
                const challenge = getDailyChallenge(userId)
                if (challenge && !challenge.completed && challenge.songId === song.id) {
                  dailyChallengeGiven.current = true
                  setDailyChallengeComplete(userId, undefined, 3)
                  addStars(userId, 3).then(() => onStarEarned?.()).catch(() => {})
                }
              }
            }, 250)
          },
          onStateChange: (event: YT.OnStateChangeEvent) => {
            setPlaying(event.data === 1)
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
      setPlaying(false)
    }
  }, [song.id, song.youtubeId])

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeLine])

  return (
    <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
      <div
        ref={containerRef}
        className="aspect-video w-full overflow-hidden rounded-lg bg-black"
      />

      {/* On lg+: aspect-[32/27] makes this column exactly the same height as the
          video (3fr col @ 16/9 → 2fr col needs 32/27 to match). Content scrolls
          inside an absolute inset-0 wrapper so overflow-y-auto works correctly. */}
      <div className="rounded-lg border bg-card p-4 overflow-y-auto max-h-[56vw] lg:max-h-none lg:aspect-[32/27] lg:overflow-hidden lg:p-0 lg:relative">
        <div className="lg:absolute lg:inset-0 lg:overflow-y-auto lg:p-4">
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
            <>
              {song.instrumentalYoutubeId && (
                <div className="flex justify-end mb-3">
                  <Button size="sm" variant="outline" onClick={toggleVocals}>
                    {isInstrumental ? 'With Vocals' : 'Music Only'}
                  </Button>
                </div>
              )}
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
