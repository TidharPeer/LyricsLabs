import { useState, useEffect, useMemo } from 'react'
import { getBestScoresByMode } from '@/lib/db'
import { getPracticedSongIds, getDailyChallenge } from '@/lib/storage'
import type { UserStats } from '@/types'

export interface Achievement {
  id: string
  name: string
  desc: string
  icon: string // lucide icon name, resolved in component
  unlocked: boolean
}

const ALL_MODES = ['fill-blank', 'fadeout', 'line-completion', 'back-chain', 'memory-burst']

export function useAchievements(
  userId: string | undefined,
  stats: UserStats | null,
  masteredCount: number,
) {
  const [modeData, setModeData] = useState<{ songId: string; mode: string; bestScore: number }[]>([])

  useEffect(() => {
    if (!userId) return
    getBestScoresByMode(userId).then(setModeData).catch(() => {})
  }, [userId])

  const achievements = useMemo<Achievement[]>(() => {
    const practicedCount = userId ? getPracticedSongIds(userId).size : 0
    const todayChallenge = userId ? getDailyChallenge(userId) : null
    const uniqueModes = new Set(modeData.map(r => r.mode))
    const hasPerfect = modeData.some(r => r.bestScore === 100)

    return [
      {
        id: 'first-stars',
        name: 'First Stars',
        desc: 'Earn 10 stars',
        icon: 'Star',
        unlocked: (stats?.stars ?? 0) >= 10,
      },
      {
        id: 'week-warrior',
        name: 'Week Warrior',
        desc: 'Reach a 7-day streak',
        icon: 'Flame',
        unlocked: (stats?.streakBest ?? 0) >= 7,
      },
      {
        id: 'explorer',
        name: 'Explorer',
        desc: 'Practice 10 different songs',
        icon: 'Music2',
        unlocked: practicedCount >= 10,
      },
      {
        id: 'perfectionist',
        name: 'Perfectionist',
        desc: 'Score 100% on any game',
        icon: 'Target',
        unlocked: hasPerfect,
      },
      {
        id: 'maestro',
        name: 'Maestro',
        desc: 'Master your first song',
        icon: 'Trophy',
        unlocked: masteredCount >= 1,
      },
      {
        id: 'all-rounder',
        name: 'All-Rounder',
        desc: 'Play all 5 game modes',
        icon: 'Gamepad2',
        unlocked: ALL_MODES.every(m => uniqueModes.has(m)),
      },
      {
        id: 'star-collector',
        name: 'Star Collector',
        desc: 'Earn 100 stars total',
        icon: 'Sparkles',
        unlocked: (stats?.stars ?? 0) >= 100,
      },
      {
        id: 'daily-devotee',
        name: 'Daily Devotee',
        desc: 'Complete a daily challenge',
        icon: 'CalendarCheck',
        unlocked: !!todayChallenge?.completed,
      },
    ]
  }, [userId, stats, masteredCount, modeData])

  return achievements
}
