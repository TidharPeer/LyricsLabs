/**
 * Data layer — Supabase-backed with localStorage cache.
 * Write to Supabase first; on success mirror to localStorage.
 * Reads prefer Supabase but fall back to localStorage if offline.
 */
import { supabase } from './supabase'
import { getSongs as localGetSongs, saveSongs, upsertSong as localUpsert, deleteSong as localDelete, getGameSessions, saveGameSession as localSaveSession } from './storage'
import type { Song, GameSession, UserStats } from '@/types'

// ─── Songs ────────────────────────────────────────────────────────────────────

/** Fetch shared song pool from Supabase, fall back to localStorage cache. */
export async function fetchSongs(): Promise<Song[]> {
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) return localGetSongs()

  const songs = data.map(rowToSong)
  saveSongs(songs) // update local cache
  return songs
}

/** Fetch songs created by a specific user. */
export async function fetchMySongs(userId: string): Promise<Song[]> {
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })

  if (error || !data) return localGetSongs().filter((s) => s.createdBy === userId)
  return data.map(rowToSong)
}

/** Full-text search over title, artist, and lyric text. */
export async function searchSongs(query: string): Promise<Song[]> {
  if (!query.trim()) return fetchSongs()

  // Try full-text search first
  const { data: ftData } = await supabase
    .from('songs')
    .select('*')
    .textSearch('search_vec', query.trim().split(/\s+/).join(' | '), { type: 'websearch' })
    .order('created_at', { ascending: false })
    .limit(50)

  if (ftData && ftData.length > 0) return ftData.map(rowToSong)

  // Fall back to ILIKE for partial matches
  const term = `%${query}%`
  const { data: likeData } = await supabase
    .from('songs')
    .select('*')
    .or(`title.ilike.${term},artist.ilike.${term}`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (likeData) return likeData.map(rowToSong)

  // Last resort: local filter
  return localGetSongs().filter(
    (s) =>
      s.title.toLowerCase().includes(query.toLowerCase()) ||
      s.artist.toLowerCase().includes(query.toLowerCase()) ||
      s.lyrics.some((l) => l.text.toLowerCase().includes(query.toLowerCase()))
  )
}

/** Save a song to Supabase + local cache. */
export async function saveSongRemote(song: Song, userId: string): Promise<Song> {
  const row = songToRow(song, userId)

  const { data, error } = await supabase
    .from('songs')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single()

  if (error || !data) {
    // Offline — save locally only
    localUpsert({ ...song, createdBy: userId })
    return song
  }

  const saved = rowToSong(data)
  localUpsert(saved)
  return saved
}

/** Delete a song from Supabase + local cache. */
export async function deleteSongRemote(id: string): Promise<void> {
  await supabase.from('songs').delete().eq('id', id)
  localDelete(id)
}

// ─── User stats ───────────────────────────────────────────────────────────────

export async function getUserStats(userId: string): Promise<UserStats> {
  const { data } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!data) return { userId, stars: 0, streakCurrent: 0, streakBest: 0, lastActiveDate: null }

  return {
    userId: data.user_id,
    stars: data.stars,
    streakCurrent: data.streak_current,
    streakBest: data.streak_best,
    lastActiveDate: data.last_active_date,
  }
}

/** Award stars to a user. Returns new star total. */
export async function addStars(userId: string, amount: number): Promise<number> {
  // Use Postgres RPC to atomically increment
  const { data } = await supabase.rpc('add_stars', { p_user_id: userId, p_amount: amount })
  return (data as number | null) ?? 0
}

/** Update daily streak and award daily star. Called on each login. */
export async function updateStreak(userId: string): Promise<UserStats> {
  const today = new Date().toISOString().slice(0, 10)
  const stats = await getUserStats(userId)

  if (stats.lastActiveDate === today) return stats // already updated today

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  const newStreak = stats.lastActiveDate === yesterday ? stats.streakCurrent + 1 : 1
  const newBest = Math.max(stats.streakBest, newStreak)

  await supabase.from('user_stats').upsert({
    user_id: userId,
    stars: stats.stars + 1, // daily login star
    streak_current: newStreak,
    streak_best: newBest,
    last_active_date: today,
    updated_at: new Date().toISOString(),
  })

  // Milestone bonuses
  if (newStreak === 7)  await addStars(userId, 5)
  if (newStreak === 30) await addStars(userId, 20)

  return { ...stats, streakCurrent: newStreak, streakBest: newBest, lastActiveDate: today }
}

// ─── Game sessions ────────────────────────────────────────────────────────────

export async function saveGameSessionRemote(
  session: GameSession,
  userId: string
): Promise<void> {
  await supabase.from('game_sessions').insert({
    id: session.id,
    user_id: userId,
    song_id: session.songId,
    mode: session.mode,
    score: session.score,
    stars_earned: session.starsEarned ?? 0,
    completed_at: new Date(session.completedAt).toISOString(),
  })
  localSaveSession(session)
}

export async function getRecentSessions(userId: string, limit = 20): Promise<GameSession[]> {
  const { data } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(limit)

  if (!data) return getGameSessions().slice(0, limit)

  return data.map((r) => ({
    id: r.id,
    songId: r.song_id,
    mode: r.mode,
    completedAt: new Date(r.completed_at).getTime(),
    score: r.score,
    starsEarned: r.stars_earned,
  }))
}

// ─── Referrals ────────────────────────────────────────────────────────────────

export function getReferralLink(userId: string): string {
  const base = import.meta.env.VITE_APP_URL ?? window.location.origin
  // Short code = first 8 chars of userId (UUID)
  return `${base}?ref=${userId.slice(0, 8)}`
}

export async function handleReferral(refCode: string, newUserId: string): Promise<void> {
  // Find the referrer whose id starts with this code
  const { data: referrer } = await supabase
    .from('user_stats')
    .select('user_id')
    .ilike('user_id', `${refCode}%`)
    .single()

  if (!referrer || referrer.user_id === newUserId) return

  // Record referral
  const { error } = await supabase.from('referrals').insert({
    referrer_id: referrer.user_id,
    referred_user_id: newUserId,
  })

  if (!error) {
    // Welcome bonus for new user + reward for referrer
    await addStars(newUserId, 5)
    await addStars(referrer.user_id, 10)
    await supabase
      .from('referrals')
      .update({ stars_awarded: true })
      .eq('referred_user_id', newUserId)
  }
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function rowToSong(row: Record<string, unknown>): Song {
  return {
    id: row.id as string,
    title: row.title as string,
    artist: row.artist as string,
    language: row.language as string,
    youtubeUrl: (row.youtube_url as string) ?? '',
    youtubeId: (row.youtube_id as string) ?? '',
    lyrics: (row.lyrics as Song['lyrics']) ?? [],
    createdAt: new Date(row.created_at as string).getTime(),
    createdBy: (row.created_by as string) ?? undefined,
  }
}

function songToRow(song: Song, userId: string) {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    language: song.language,
    youtube_url: song.youtubeUrl,
    youtube_id: song.youtubeId,
    lyrics: song.lyrics,
    created_by: userId,
    created_at: new Date(song.createdAt).toISOString(),
  }
}
