import { useState, useCallback } from 'react'
import { getSongs, upsertSong, deleteSong as removeSong } from '@/lib/storage'
import type { Song } from '@/types'

export function useSongs() {
  const [songs, setSongs] = useState<Song[]>(() => getSongs())

  const refresh = useCallback(() => {
    setSongs(getSongs())
  }, [])

  const addOrUpdate = useCallback((song: Song) => {
    upsertSong(song)
    setSongs(getSongs())
  }, [])

  const remove = useCallback((id: string) => {
    removeSong(id)
    setSongs(getSongs())
  }, [])

  return { songs, addOrUpdate, remove, refresh }
}
