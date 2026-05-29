import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { fetchSong, addStars, saveGameSessionRemote } from '@/lib/db'
import { findActiveLine } from '@/lib/activeLine'
import { Button } from '@/components/ui/button'
import { CompactPlayer } from '@/components/player/CompactPlayer'
import { FillInTheBlank } from '@/components/games/FillInTheBlank'
import { FadeOutChallenge } from '@/components/games/FadeOutChallenge'
import { LineCompletion } from '@/components/games/LineCompletion'
import { StarsCounter } from '@/components/profile/StarsCounter'
import { useAuth } from '@/contexts/AuthContext'
import { scoreToStars } from '@/types'
import type { Song, GameMode } from '@/types'

export function GamePage() {
  const { t } = useTranslation()
  const { id, mode } = useParams<{ id: string; mode: string }>()
  const navigate = useNavigate()
  const { user, refreshStats } = useAuth()

  const [song, setSong] = useState<Song | null>(null)
  const [loading, setLoading] = useState(true)
  const [starsEarned, setStarsEarned] = useState(0)
  const [showStars, setShowStars] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    fetchSong(id).then(s => { setSong(s ?? null); setLoading(false) })
  }, [id])

  const activeLine = song ? findActiveLine(song.lyrics, currentTime) : -1

  const handleGameComplete = useCallback(async (score: number, sessionId: string) => {
    const stars = scoreToStars(score)
    if (user) {
      if (stars > 0) {
        await addStars(user.id, stars)
        setStarsEarned(stars)
        setShowStars(true)
      }
      await saveGameSessionRemote({
        id: sessionId,
        songId: song?.id ?? '',
        mode: mode as GameMode,
        completedAt: Date.now(),
        score,
        starsEarned: stars,
      }, user.id)
      await refreshStats()
    }
  }, [user, refreshStats, song?.id, mode])

  if (loading) {
    return <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
  }

  if (!song) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">{t('common.notFound')}</p>
        <Button className="mt-4" onClick={() => navigate('/')}>
          {t('common.back')}
        </Button>
      </div>
    )
  }

  function handleBack() {
    navigate(`/songs/${song!.id}`)
  }

  const modeLabels: Record<GameMode, string> = {
    'fill-blank': t('game.fillBlank'),
    'fadeout': t('game.fadeout'),
    'line-completion': t('game.lineCompletion'),
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{modeLabels[mode as GameMode] ?? mode}</h1>
          <p className="text-sm text-muted-foreground">{song.title} — {song.artist}</p>
        </div>
      </div>

      {song.youtubeId && (
        <CompactPlayer
          videoId={song.youtubeId}
          title={`${song.title} — ${song.artist}`}
          autoPlay
          onTimeUpdate={setCurrentTime}
        />
      )}

      {mode === 'fill-blank' && (
        <FillInTheBlank song={song} onBack={handleBack} onComplete={handleGameComplete} activeLine={activeLine} />
      )}
      {mode === 'fadeout' && (
        <FadeOutChallenge song={song} onBack={handleBack} onComplete={handleGameComplete} activeLine={activeLine} />
      )}
      {mode === 'line-completion' && (
        <LineCompletion song={song} onBack={handleBack} onComplete={handleGameComplete} activeLine={activeLine} />
      )}

      {!['fill-blank', 'fadeout', 'line-completion'].includes(mode ?? '') && (
        <p className="text-muted-foreground text-center">{t('common.notFound')}</p>
      )}

      {showStars && (
        <StarsCounter earned={starsEarned} onDone={() => setShowStars(false)} />
      )}
    </div>
  )
}
