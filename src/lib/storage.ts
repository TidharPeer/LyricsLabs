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

// ─── Recently played ──────────────────────────────────────────────────────────

interface RecentSongEntry { songId: string; playedAt: number }

function recentSongsKey(userId: string) { return `recentSongs:${userId}` }
function recentPlaylistKey(userId: string) { return `recentPlaylist:${userId}` }

export function addRecentSong(userId: string, songId: string): void {
  const key = recentSongsKey(userId)
  try {
    const existing: RecentSongEntry[] = JSON.parse(localStorage.getItem(key) ?? '[]')
    const filtered = existing.filter(e => e.songId !== songId)
    filtered.unshift({ songId, playedAt: Date.now() })
    localStorage.setItem(key, JSON.stringify(filtered.slice(0, 5)))
  } catch { /* ignore */ }
}

export function getRecentSongIds(userId: string): string[] {
  try {
    const entries: RecentSongEntry[] = JSON.parse(localStorage.getItem(recentSongsKey(userId)) ?? '[]')
    return entries.map(e => e.songId)
  } catch { return [] }
}

export function setRecentPlaylist(userId: string, playlistId: string): void {
  try {
    localStorage.setItem(recentPlaylistKey(userId), JSON.stringify({ playlistId, playedAt: Date.now() }))
  } catch { /* ignore */ }
}

export function getRecentPlaylistId(userId: string): string | null {
  try {
    const raw = localStorage.getItem(recentPlaylistKey(userId))
    return raw ? JSON.parse(raw).playlistId : null
  } catch { return null }
}

// ─── YouTube ──────────────────────────────────────────────────────────────────

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
