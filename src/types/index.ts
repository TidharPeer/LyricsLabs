export interface LyricLine {
  id: string
  text: string
  timestamp?: number // seconds into video
}

export interface Song {
  id: string
  title: string
  artist: string
  language: string // BCP-47: 'en', 'he', 'es', etc.
  youtubeUrl: string
  youtubeId: string
  lyrics: LyricLine[]
  createdAt: number
}

export interface GameSession {
  id: string
  songId: string
  mode: GameMode
  completedAt: number
  score: number // 0–100
}

export type GameMode = 'fill-blank' | 'fadeout' | 'line-completion'
