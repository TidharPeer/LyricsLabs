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
  createdBy?: string // user id — set when saved to Supabase
}

export interface GameSession {
  id: string
  songId: string
  mode: GameMode
  completedAt: number
  score: number // 0–100
  starsEarned?: number
}

export type GameMode = 'fill-blank' | 'fadeout' | 'line-completion'

export interface UserStats {
  userId: string
  stars: number
  streakCurrent: number
  streakBest: number
  lastActiveDate: string | null // 'YYYY-MM-DD'
}

export interface Playlist {
  id: string
  name: string
  createdBy: string
  createdAt: number
  songCount?: number
}

export function scoreToStars(score: number): number {
  if (score >= 91) return 5
  if (score >= 81) return 4
  if (score >= 61) return 3
  if (score >= 41) return 2
  if (score >= 1)  return 1
  return 0
}
