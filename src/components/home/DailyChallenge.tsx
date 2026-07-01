import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { fetchSong } from '@/lib/db'
import { getPracticedSongIds, getDailyChallenge, initDailyChallenge } from '@/lib/storage'
import type { Song } from '@/types'

interface Props {
  userId: string
}

export function DailyChallenge({ userId }: Props) {
  const [song, setSong] = useState<Song | null>(null)
  const [challenge, setChallenge] = useState(getDailyChallenge(userId))

  useEffect(() => {
    const ids = [...getPracticedSongIds(userId)]
    if (ids.length === 0) return
    const songId = initDailyChallenge(userId, ids)
    const c = getDailyChallenge(userId)
    setChallenge(c)
    if (songId) fetchSong(songId).then(s => setSong(s ?? null)).catch(() => {})
  }, [userId])

  if (!song || !challenge) return null

  return (
    <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CalendarCheck className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-semibold text-primary">Daily Challenge</span>
        <Badge variant="outline" className="ml-auto text-xs">Listen 50% to complete</Badge>
      </div>

      <div>
        <p className="font-medium leading-snug">{song.title}</p>
        <p className="text-sm text-muted-foreground">{song.artist}</p>
      </div>

      {challenge.completed ? (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Completed! +{challenge.starsEarned} ★</span>
        </div>
      ) : (
        <Button asChild size="sm">
          <Link to={`/songs/${song.id}`}>Listen & Complete</Link>
        </Button>
      )}
    </div>
  )
}
