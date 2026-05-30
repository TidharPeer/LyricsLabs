/**
 * Data layer — Supabase only. No localStorage for songs.
 * Game sessions still have a local backup in storage.ts.
 */
import { supabase } from './supabase'
import { getGameSessions } from './storage'
import type { Song, GameSession, UserStats, Playlist } from '@/types'

// ─── Songs ────────────────────────────────────────────────────────────────────

export async function fetchSongs(): Promise<Song[]> {
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data.map(rowToSong)
}

export async function fetchMySongs(userId: string): Promise<Song[]> {
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data.map(rowToSong)
}

export async function fetchSong(id: string): Promise<Song | undefined> {
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return undefined
  return rowToSong(data)
}

export async function searchSongs(query: string): Promise<Song[]> {
  if (!query.trim()) return fetchSongs()

  const { data: ftData } = await supabase
    .from('songs')
    .select('*')
    .textSearch('search_vec', query.trim().split(/\s+/).join(' | '), { type: 'websearch' })
    .order('created_at', { ascending: false })
    .limit(50)

  if (ftData && ftData.length > 0) return ftData.map(rowToSong)

  const term = `%${query}%`
  const { data: likeData, error } = await supabase
    .from('songs')
    .select('*')
    .or(`title.ilike.${term},artist.ilike.${term}`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return (likeData ?? []).map(rowToSong)
}

export async function saveSongRemote(song: Song, userId: string): Promise<Song> {
  const row = songToRow(song, userId)

  const { data, error } = await supabase
    .from('songs')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return rowToSong(data)
}

export async function deleteSongRemote(id: string): Promise<void> {
  const { error } = await supabase.from('songs').delete().eq('id', id)
  if (error) throw new Error(error.message)
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

export async function addStars(userId: string, amount: number): Promise<UserStats> {
  const current = await getUserStats(userId)
  const newStars = current.stars + amount
  await supabase
    .from('user_stats')
    .upsert({ user_id: userId, stars: newStars, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  return { ...current, stars: newStars }
}

export async function updateStreak(userId: string): Promise<UserStats> {
  const today = new Date().toISOString().slice(0, 10)
  const stats = await getUserStats(userId)

  if (stats.lastActiveDate === today) return stats

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  const newStreak = stats.lastActiveDate === yesterday ? stats.streakCurrent + 1 : 1
  const newBest   = Math.max(stats.streakBest, newStreak)

  let bonus = 1
  if (newStreak === 7)  bonus += 5
  if (newStreak === 30) bonus += 20

  const newStars = stats.stars + bonus

  await supabase.from('user_stats').upsert({
    user_id: userId,
    stars: newStars,
    streak_current: newStreak,
    streak_best: newBest,
    last_active_date: today,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  return { userId, stars: newStars, streakCurrent: newStreak, streakBest: newBest, lastActiveDate: today }
}

// ─── Game sessions ────────────────────────────────────────────────────────────

export async function saveGameSessionRemote(
  session: GameSession,
  userId: string
): Promise<void> {
  const { error } = await supabase.from('game_sessions').insert({
    id: session.id,
    user_id: userId,
    song_id: null,
    mode: session.mode,
    score: session.score,
    stars_earned: session.starsEarned ?? 0,
    completed_at: new Date(session.completedAt).toISOString(),
  })
  if (error) console.warn('saveGameSessionRemote:', error.message)
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
  return `${base}?ref=${userId.slice(0, 8)}`
}

export async function handleReferral(refCode: string, newUserId: string): Promise<void> {
  const { data: referrer } = await supabase
    .from('user_stats')
    .select('user_id')
    .ilike('user_id', `${refCode}%`)
    .single()

  if (!referrer || referrer.user_id === newUserId) return

  const { error } = await supabase.from('referrals').insert({
    referrer_id: referrer.user_id,
    referred_user_id: newUserId,
  })

  if (!error) {
    await addStars(newUserId, 5)
    await addStars(referrer.user_id, 10)
    await supabase
      .from('referrals')
      .update({ stars_awarded: true })
      .eq('referred_user_id', newUserId)
  }
}

// ─── Playlists ────────────────────────────────────────────────────────────────

export async function fetchPlaylists(userId: string): Promise<Playlist[]> {
  const { data, error } = await supabase
    .from('playlists')
    .select('*, playlist_songs(count)')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(row => ({
    id: row.id as string,
    name: row.name as string,
    createdBy: row.created_by as string,
    createdAt: new Date(row.created_at as string).getTime(),
    songCount: (row.playlist_songs as { count: number }[])?.[0]?.count ?? 0,
  }))
}

export async function createPlaylist(name: string, userId: string): Promise<Playlist> {
  const { data, error } = await supabase
    .from('playlists')
    .insert({ name: name.trim(), created_by: userId })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return {
    id: data.id as string,
    name: data.name as string,
    createdBy: data.created_by as string,
    createdAt: new Date(data.created_at as string).getTime(),
    songCount: 0,
  }
}

export async function deletePlaylist(id: string): Promise<void> {
  const { error } = await supabase.from('playlists').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function renamePlaylist(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('playlists').update({ name }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function fetchPlaylistSongs(playlistId: string): Promise<Song[]> {
  const { data, error } = await supabase
    .from('playlist_songs')
    .select('songs(*)')
    .eq('playlist_id', playlistId)
    .order('added_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? [])
    .map((row: Record<string, unknown>) => row.songs)
    .filter(Boolean)
    .map(s => rowToSong(s as Record<string, unknown>))
}

export async function addSongToPlaylist(playlistId: string, songId: string): Promise<void> {
  const { error } = await supabase
    .from('playlist_songs')
    .insert({ playlist_id: playlistId, song_id: songId })
  // 23505 = unique_violation — song already in playlist, treat as success
  if (error && error.code !== '23505') throw new Error(error.message)
}

export async function removeSongFromPlaylist(playlistId: string, songId: string): Promise<void> {
  const { error } = await supabase
    .from('playlist_songs')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('song_id', songId)
  if (error) throw new Error(error.message)
}

export async function getSongPlaylistIds(songId: string, userId: string): Promise<string[]> {
  const { data: playlists } = await supabase
    .from('playlists')
    .select('id')
    .eq('created_by', userId)

  if (!playlists?.length) return []

  const { data, error } = await supabase
    .from('playlist_songs')
    .select('playlist_id')
    .eq('song_id', songId)
    .in('playlist_id', playlists.map(p => p.id))

  if (error) throw new Error(error.message)
  return (data ?? []).map(row => row.playlist_id as string)
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
