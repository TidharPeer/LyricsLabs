import type { Song, GameSession } from '@/types'

const SONGS_KEY = 'songs'
const SESSIONS_KEY = 'gameSessions'

export function getSongs(): Song[] {
  try {
    return JSON.parse(localStorage.getItem(SONGS_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveSongs(songs: Song[]): void {
  localStorage.setItem(SONGS_KEY, JSON.stringify(songs))
}

export function getSong(id: string): Song | undefined {
  return getSongs().find((s) => s.id === id)
}

export function upsertSong(song: Song): void {
  const songs = getSongs()
  const idx = songs.findIndex((s) => s.id === song.id)
  if (idx >= 0) {
    songs[idx] = song
  } else {
    songs.unshift(song)
  }
  saveSongs(songs)
}

export function deleteSong(id: string): void {
  saveSongs(getSongs().filter((s) => s.id !== id))
}

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
