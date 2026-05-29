import type { GameSession } from '@/types'

const SESSIONS_KEY = 'gameSessions'

export function getGameSessions(): GameSession[] {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveGameSession(session: GameSession): void {
  const sessions = getGameSessions()
  sessions.unshift(session)
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, 200)))
}

export function extractYouTubeId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return ''
}
