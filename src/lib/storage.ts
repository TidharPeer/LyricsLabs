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

// ─── Practiced songs (per user, persisted) ───────────────────────────────────

function practicedKey(userId: string) { return `practiced:${userId}` }

export function markPracticed(userId: string, songId: string): void {
  try {
    const key = practicedKey(userId)
    const existing: string[] = JSON.parse(localStorage.getItem(key) ?? '[]')
    if (!existing.includes(songId)) {
      existing.push(songId)
      localStorage.setItem(key, JSON.stringify(existing))
    }
  } catch { /* ignore */ }
}

export function getPracticedSongIds(userId: string): Set<string> {
  try {
    const ids: string[] = JSON.parse(localStorage.getItem(practicedKey(userId)) ?? '[]')
    return new Set(ids)
  } catch { return new Set() }
}

// ─── Daily Challenge ─────────────────────────────────────────────────────────

interface DailyChallengeEntry {
  songId: string
  date: string
  completed: boolean
  score?: number
  starsEarned?: number
}

function todayStr() {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function dailyChallengeKey(userId: string, date: string) {
  return `dailyChallenge:${userId}:${date}`
}

export function initDailyChallenge(userId: string, practicedIds: string[]): string | null {
  if (practicedIds.length === 0) return null
  const today = todayStr()
  const key = dailyChallengeKey(userId, today)
  try {
    const existing = localStorage.getItem(key)
    if (existing) return JSON.parse(existing).songId as string
    const idx = hashStr(userId + today) % practicedIds.length
    const songId = practicedIds[idx]
    const entry: DailyChallengeEntry = { songId, date: today, completed: false }
    localStorage.setItem(key, JSON.stringify(entry))
    return songId
  } catch { return null }
}

export function getDailyChallenge(userId: string): DailyChallengeEntry | null {
  try {
    const raw = localStorage.getItem(dailyChallengeKey(userId, todayStr()))
    return raw ? (JSON.parse(raw) as DailyChallengeEntry) : null
  } catch { return null }
}

export function setDailyChallengeComplete(userId: string, score: number, starsEarned: number): void {
  try {
    const today = todayStr()
    const key = dailyChallengeKey(userId, today)
    const existing = getDailyChallenge(userId) ?? { songId: '', date: today, completed: false }
    localStorage.setItem(key, JSON.stringify({ ...existing, completed: true, score, starsEarned }))
  } catch { /* ignore */ }
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
