import type { LyricLine } from '@/types'

export function findActiveLine(lyrics: LyricLine[], currentTime: number): number {
  if (currentTime <= 0) return -1
  let active = -1
  for (let i = 0; i < lyrics.length; i++) {
    const ts = lyrics[i].timestamp
    if (ts !== undefined && ts <= currentTime) active = i
  }
  return active
}
