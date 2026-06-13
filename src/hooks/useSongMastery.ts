import { useState, useEffect } from 'react'
import { getBestScoresByMode } from '@/lib/db'

export type MasteryStatus = 'mastered' | 'in-progress' | 'not-started'

// 4★ threshold = 81%; mastered when hit on at least 3 of the 5 game modes
const MASTERY_SCORE = 81
const MASTERY_MODES_REQUIRED = 3

const ALL_MODES = ['fill-blank', 'fadeout', 'line-completion', 'back-chain', 'memory-burst']

export function useSongMastery(userId: string | undefined) {
  const [data, setData] = useState<Map<string, Map<string, number>>>(new Map())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!userId) { setLoaded(true); return }
    getBestScoresByMode(userId)
      .then(rows => {
        const map = new Map<string, Map<string, number>>()
        for (const { songId, mode, bestScore } of rows) {
          if (!map.has(songId)) map.set(songId, new Map())
          map.get(songId)!.set(mode, bestScore)
        }
        setData(map)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [userId])

  function getMasteryStatus(songId: string): MasteryStatus {
    const modes = data.get(songId)
    if (!modes || modes.size === 0) return 'not-started'
    const masteredModes = [...modes.values()].filter(s => s >= MASTERY_SCORE).length
    return masteredModes >= MASTERY_MODES_REQUIRED ? 'mastered' : 'in-progress'
  }

  function getModeBestScores(songId: string): Record<string, number | null> {
    const modes = data.get(songId) ?? new Map<string, number>()
    return Object.fromEntries(ALL_MODES.map(m => [m, modes.get(m) ?? null]))
  }

  const masteredCount = [...data.entries()].filter(
    ([, modes]) => [...modes.values()].filter(s => s >= MASTERY_SCORE).length >= MASTERY_MODES_REQUIRED
  ).length

  return { getMasteryStatus, getModeBestScores, masteredCount, loaded }
}
