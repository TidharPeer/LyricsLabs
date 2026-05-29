// Minimal ambient declarations for the YouTube IFrame API (loaded at runtime via script tag)

declare namespace YT {
  class Player {
    constructor(el: string | HTMLElement, options: PlayerOptions)
    getCurrentTime(): number
    seekTo(seconds: number, allowSeekAhead: boolean): void
    destroy(): void
    playVideo(): void
    pauseVideo(): void
  }

  interface PlayerOptions {
    videoId?: string
    width?: string | number
    height?: string | number
    playerVars?: Record<string, number | string>
    events?: {
      onReady?: (event: PlayerEvent) => void
      onStateChange?: (event: OnStateChangeEvent) => void
    }
  }

  interface PlayerEvent {
    target: Player
  }

  interface OnStateChangeEvent {
    target: Player
    data: number
  }
}

interface Window {
  YT: typeof YT
  onYouTubeIframeAPIReady: () => void
}
