import { useEffect, useRef, useState, useCallback } from 'react'
import { loadYTApi } from '@/lib/youtube'

export function useYouTubePlayer(containerId: string, videoId: string) {
  const playerRef = useRef<YT.Player | null>(null)
  const [ready, setReady] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!videoId) return
    const el = document.getElementById(containerId)
    if (!el) return

    loadYTApi(() => {
      try { playerRef.current?.destroy() } catch { /* ignore */ }

      playerRef.current = new window.YT.Player(containerId, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: { onReady: () => setReady(true) },
      })
    })

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      try { playerRef.current?.destroy() } catch { /* ignore */ }
      playerRef.current = null
      setReady(false)
    }
  }, [containerId, videoId])

  useEffect(() => {
    if (!ready) return
    intervalRef.current = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        setCurrentTime(playerRef.current.getCurrentTime())
      }
    }, 250)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [ready])

  const seekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds, true)
  }, [])

  const getCurrentTime = useCallback((): number => {
    return playerRef.current?.getCurrentTime?.() ?? 0
  }, [])

  return { ready, currentTime, seekTo, getCurrentTime, player: playerRef }
}
