import { useEffect, useRef, useState } from 'react'
import { Music2, Video, VideoOff, Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { loadYTApi } from '@/lib/youtube'

interface Props {
  videoId: string
  title: string
  autoPlay?: boolean
  onTimeUpdate?: (time: number) => void
}

export function CompactPlayer({ videoId, title, autoPlay = false, onTimeUpdate }: Props) {
  const playerDivRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YT.Player | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onTimeUpdateRef = useRef(onTimeUpdate)
  onTimeUpdateRef.current = onTimeUpdate

  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(autoPlay)
  const [audioOnly, setAudioOnly] = useState(autoPlay)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!videoId || !playerDivRef.current) return

    loadYTApi(() => {
      if (!playerDivRef.current) return
      try { playerRef.current?.destroy() } catch { /* ignore */ }

      const div = document.createElement('div')
      playerDivRef.current.innerHTML = ''
      playerDivRef.current.appendChild(div)

      playerRef.current = new window.YT.Player(div, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          rel: 0,
          modestbranding: 1,
          autoplay: autoPlay ? 1 : 0,
        },
        events: {
          onReady: (event) => {
            setReady(true)
            if (autoPlay) event.target.playVideo()
            intervalRef.current = setInterval(() => {
              const t = playerRef.current?.getCurrentTime?.() ?? 0
              onTimeUpdateRef.current?.(t)
            }, 250)
          },
          onStateChange: (event) => {
            setPlaying(event.data === 1)
          },
        },
      })
    })

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      try { playerRef.current?.destroy() } catch { /* ignore */ }
      playerRef.current = null
      setReady(false)
      setPlaying(false)
    }
  }, [videoId]) // eslint-disable-line react-hooks/exhaustive-deps

  function togglePlay() {
    if (!playerRef.current) return
    if (playing) {
      playerRef.current.pauseVideo()
    } else {
      playerRef.current.playVideo()
    }
  }

  function handleClose() {
    try { playerRef.current?.pauseVideo() } catch { /* ignore */ }
    setOpen(false)
    setAudioOnly(false)
  }

  const showVideo = open && !audioOnly

  return (
    <div className="rounded-lg border bg-muted/30 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        <span
          className={`shrink-0 w-2 h-2 rounded-full transition-colors ${
            playing ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30'
          }`}
        />

        <Music2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="flex-1 text-sm font-medium truncate">{title}</span>

        <div className="flex items-center gap-1">
          {open && ready && (
            <>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={togglePlay}>
                {playing
                  ? <Pause className="h-3.5 w-3.5" />
                  : <Play className="h-3.5 w-3.5" />}
              </Button>

              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                title={audioOnly ? 'Show video' : 'Audio only (video hidden)'}
                onClick={() => setAudioOnly((a) => !a)}
              >
                {audioOnly
                  ? <Video className="h-3.5 w-3.5" />
                  : <VideoOff className="h-3.5 w-3.5" />}
              </Button>
            </>
          )}

          {!open && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-3"
              disabled={!ready}
              onClick={() => { setOpen(true); setAudioOnly(true) }}
            >
              {ready ? 'Play music' : 'Loading…'}
            </Button>
          )}

          {open && (
            <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={handleClose}>
              ✕
            </Button>
          )}
        </div>
      </div>

      {open && audioOnly && (
        <div className="px-3 pb-2 text-xs text-muted-foreground">
          {ready
            ? playing ? 'Playing in background — click ✕ to stop' : 'Paused — press ▶ to resume'
            : 'Loading player…'}
        </div>
      )}

      <div
        ref={playerDivRef}
        style={showVideo ? undefined : { width: 1, height: 1, opacity: 0, overflow: 'hidden' }}
        className={showVideo ? 'aspect-video w-full bg-black' : ''}
      />
    </div>
  )
}
