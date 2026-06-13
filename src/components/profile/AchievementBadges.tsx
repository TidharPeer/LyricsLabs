import {
  Star, Flame, Music2, Target, Trophy, Gamepad2, Sparkles, CalendarCheck, Lock,
} from 'lucide-react'
import { useAchievements } from '@/hooks/useAchievements'
import type { UserStats } from '@/types'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Star, Flame, Music2, Target, Trophy, Gamepad2, Sparkles, CalendarCheck,
}

interface Props {
  userId: string
  stats: UserStats | null
  masteredCount: number
}

export function AchievementBadges({ userId, stats, masteredCount }: Props) {
  const achievements = useAchievements(userId, stats, masteredCount)
  const unlockedCount = achievements.filter(a => a.unlocked).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Achievements</h3>
        <span className="text-xs text-muted-foreground">{unlockedCount} / {achievements.length}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {achievements.map(({ id, name, desc, icon, unlocked }) => {
          const Icon = ICON_MAP[icon] ?? Star
          return (
            <div
              key={id}
              className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                unlocked
                  ? 'bg-card'
                  : 'bg-muted/30 opacity-50'
              }`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                unlocked ? 'bg-primary/10' : 'bg-muted'
              }`}>
                {unlocked
                  ? <Icon className="h-4 w-4 text-primary" />
                  : <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                }
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{name}</p>
                <p className="text-xs text-muted-foreground leading-snug mt-0.5">{desc}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
