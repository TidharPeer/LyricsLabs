import { useEffect, useRef, useState } from 'react'
import { Music2, Video, VideoOff, Play, Pause, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { loadYTApi } from '@/lib/youtube'

interface Props {
  videoId: string
  title: string
  autoPlay?: boolean
  onTimeUpdate?: (time: number) => void
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function CompactPlayer({ videoId, title, autoPlay = false, onTimeUpdate }: Props) {
  const playerDivRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YT.Player | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onTimeUpdateRef = useRef(onTimeUpdate)
  onTimeUpdateRef.current = onTimeUpdate
  const seekingRef = useRef(false)

  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(autoPlay)
  const [audioOnly, setAudioOnly] = useState(autoPlay)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

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
              const d = (playerRef.current as unknown as { getDuration?(): number })?.getDuration?.() ?? 0
              if (!seekingRef.current) {
                setCurrentTime(t)
                setDuration(d)
              }
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
    if (playing) playerRef.current.pauseVideo()
    else playerRef.current.playVideo()
  }

  function restart() {
    playerRef.current?.seekTo(0, true)
    setCurrentTime(0)
  }

  function handleSeekStart() {
    seekingRef.current = true
  }

  function handleSeekChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCurrentTime(Number(e.target.value))
  }

  function handleSeekEnd(e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) {
    const val = Number((e.target as HTMLInputElement).value)
    playerRef.current?.seekTo(val, true)
    seekingRef.current = false
  }

  function handleClose() {
    try { playerRef.current?.pauseVideo() } catch { /* ignore */ }
    setOpen(false)
    setAudioOnly(false)
  }

  const showVideo = open && !audioOnly
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="rounded-lg border bg-muted/30 overflow-hidden">
      {/* Control bar */}
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
                {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                title={audioOnly ? 'Show video' : 'Audio only'}
                onClick={() => setAudioOnly((a) => !a)}
              >
                {audioOnly ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
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

      {/* Audio scrubber — shown when playing audio-only */}
      {open && audioOnly && (
        <div className="px-3 pb-3 space-y-1.5">
          {ready ? (
            <>
              <div className="flex items-center gap-2">
                {/* Restart button */}
                <button
                  onClick={restart}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  title="Restart"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>

                {/* Current time */}
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground w-8 text-right">
                  {formatTime(currentTime)}
                </span>

                {/* Seek bar */}
                <div className="relative flex-1 flex items-center h-4">
                  {/* Track background */}
                  <div className="absolute inset-x-0 h-1 rounded-full bg-border" />
                  {/* Progress fill */}
                  <div
                    className="absolute left-0 h-1 rounded-full transition-none"
                    style={{ width: `${progress}%`, background: 'var(--primary)' }}
                  />
                  {/* Native range input (transparent, sits on top for interaction) */}
                  <input
                    type="range"
                    className="absolute inset-x-0 w-full h-1 opacity-0 cursor-pointer"
                    min={0}
                    max={duration || 100}
                    step={0.5}
                    value={currentTime}
                    onMouseDown={handleSeekStart}
                    onTouchStart={handleSeekStart}
                    onChange={handleSeekChange}
                    onMouseUp={handleSeekEnd}
                    onTouchEnd={handleSeekEnd}
                  />
                  {/* Thumb dot */}
                  <div
                    className="absolute w-3 h-3 rounded-full shadow-sm -translate-x-1/2 pointer-events-none"
                    style={{ left: `${progress}%`, background: 'var(--primary)' }}
                  />
                </div>

                {/* Duration */}
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground w-8">
                  {duration > 0 ? formatTime(duration) : '--:--'}
                </span>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                {playing ? 'Playing in background' : 'Paused'}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Loading player…</p>
          )}
        </div>
      )}

      {/* YouTube player div — 1×1 when audio-only so audio keeps running */}
      <div
        ref={playerDivRef}
        style={showVideo ? undefined : { width: 1, height: 1, opacity: 0, overflow: 'hidden' }}
        className={showVideo ? 'aspect-video w-full bg-black' : ''}
      />
    </div>
  )
}
