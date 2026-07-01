import { useEffect, useRef } from 'react'

interface UseMediaSessionOptions {
  title: string
  artist: string
  youtubeId: string
  playing: boolean
  currentTime: number
  duration: number
  onPlay: () => void
  onPause: () => void
  onSeek?: (time: number) => void
}

export function useMediaSession({
  title,
  artist,
  youtubeId,
  playing,
  currentTime,
  duration,
  onPlay,
  onPause,
  onSeek,
}: UseMediaSessionOptions) {
  const onPlayRef = useRef(onPlay)
  const onPauseRef = useRef(onPause)
  const onSeekRef = useRef(onSeek)
  useEffect(() => { onPlayRef.current = onPlay }, [onPlay])
  useEffect(() => { onPauseRef.current = onPause }, [onPause])
  useEffect(() => { onSeekRef.current = onSeek }, [onSeek])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      artwork: [{ src: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`, sizes: '480x360', type: 'image/jpeg' }],
    })
  }, [title, artist, youtubeId])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
  }, [playing])

  useEffect(() => {
    if (!('mediaSession' in navigator) || duration <= 0) return
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.min(currentTime, duration),
      })
    } catch { /* some browsers throw if position > duration */ }
  }, [currentTime, duration])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.setActionHandler('play', () => onPlayRef.current())
    navigator.mediaSession.setActionHandler('pause', () => onPauseRef.current())
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) onSeekRef.current?.(details.seekTime)
    })
    return () => {
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('seekto', null)
    }
  }, [])
}
