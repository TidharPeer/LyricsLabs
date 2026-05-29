import { useEffect, useRef, useState } from 'react'
import { Music2, Video, VideoOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { loadYTApi } from '@/lib/youtube'

interface Props {
  videoId: string
  title: string
}

/**
 * Keeps the YouTube iframe always rendered (never display:none or height:0)
 * so audio continues even when the video is visually hidden.
 * When "audio only", the iframe is 1×1px and transparent.
 */
export function CompactPlayer({ videoId, title }: Props) {
  const playerDivRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YT.Player | null>(null)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [audioOnly, setAudioOnly] = useState(false)

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
        playerVars: { rel: 0, modestbranding: 1 },
        events: { onReady: () => setReady(true) },
      })
    })

    return () => {
      try { playerRef.current?.destroy() } catch { /* ignore */ }
      playerRef.current = null
      setReady(false)
    }
  }, [videoId])

  // The player div is ALWAYS in the DOM. We control its visual size:
  // - Collapsed (not open): 1×1px transparent — audio paused since not started, won't auto-start
  // - Open + video visible: normal 16:9
  // - Open + audio only: 1×1px transparent — audio keeps playing
  const showVideo = open && !audioOnly

  return (
    <div className="rounded-lg border bg-muted/30 overflow-hidden">
      {/* Control bar */}
      <div className="flex items-center gap-3 px-4 py-2">
        <Music2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="flex-1 text-sm font-medium truncate">{title}</span>

        <div className="flex items-center gap-1">
          {open && (
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
          )}
          <Button
            size="sm"
            variant={open ? 'secondary' : 'default'}
            className="h-7 text-xs px-3"
            onClick={() => { setOpen((o) => !o); setAudioOnly(false) }}
            disabled={!ready && !open}
          >
            {open ? 'Close' : ready ? 'Open player' : 'Loading…'}
          </Button>
        </div>
      </div>

      {/* Status bar when audio-only mode */}
      {open && audioOnly && (
        <div className="px-4 pb-2 text-xs text-muted-foreground flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Playing audio in background
        </div>
      )}

      {/*
        Player container — always rendered, never display:none.
        Size changes between visible (aspect-video) and tiny (1×1px invisible).
        This keeps the YouTube iframe alive so audio doesn't stop.
      */}
      <div
        ref={playerDivRef}
        style={showVideo ? undefined : { width: 1, height: 1, opacity: 0, overflow: 'hidden' }}
        className={showVideo ? 'aspect-video w-full bg-black' : ''}
      />
    </div>
  )
}
