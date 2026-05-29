import { useEffect, useRef } from 'react'
import { loadYTApi } from '@/lib/youtube'

interface Props {
  videoId: string
  onReady?: () => void
}

export function YouTubePlayer({ videoId, onReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YT.Player | null>(null)

  useEffect(() => {
    if (!videoId || !containerRef.current) return

    loadYTApi(() => {
      if (!containerRef.current) return
      try { playerRef.current?.destroy() } catch { /* ignore */ }

      const div = document.createElement('div')
      containerRef.current.innerHTML = ''
      containerRef.current.appendChild(div)

      playerRef.current = new window.YT.Player(div, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, modestbranding: 1 },
        events: { onReady: () => onReady?.() },
      })
    })

    return () => {
      try { playerRef.current?.destroy() } catch { /* ignore */ }
      playerRef.current = null
    }
  }, [videoId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!videoId) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-muted text-muted-foreground text-sm">
        No video linked
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="aspect-video w-full overflow-hidden rounded-lg bg-black"
    />
  )
}
