import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { fetchSong, addStars, saveGameSessionRemote } from '@/lib/db'
import { getDailyChallenge, setDailyChallengeComplete } from '@/lib/storage'
import { findActiveLine } from '@/lib/activeLine'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CompactPlayer } from '@/components/player/CompactPlayer'
import type { PlayerControls } from '@/components/player/CompactPlayer'
import { FillInTheBlank } from '@/components/games/FillInTheBlank'
import { FadeOutChallenge } from '@/components/games/FadeOutChallenge'
import { LineCompletion } from '@/components/games/LineCompletion'
import { BackChain } from '@/components/games/BackChain'
import { MemoryBurst } from '@/components/games/MemoryBurst'
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
  const [showGuestNudge, setShowGuestNudge] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [playerControls, setPlayerControls] = useState<PlayerControls | null>(null)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    fetchSong(id).then(s => { setSong(s ?? null); setLoading(false) })
  }, [id])

  const activeLine = song ? findActiveLine(song.lyrics, currentTime) : -1

  const handleGameComplete = useCallback(async (score: number, sessionId: string) => {
    const stars = Math.max(1, scoreToStars(score)) // always at least 1 star for completing
    if (user) {
      let totalStars = stars

      // Daily challenge bonus: +3 stars if this song is today's uncompleted challenge
      const challenge = getDailyChallenge(user.id)
      const isChallenge = challenge && !challenge.completed && challenge.songId === song?.id
      if (isChallenge) {
        totalStars += 3
        setDailyChallengeComplete(user.id, score, totalStars)
      }

      if (totalStars > 0) {
        await addStars(user.id, totalStars)
        setStarsEarned(totalStars)
        setShowStars(true)
      }
      await saveGameSessionRemote({
        id: sessionId,
        songId: song?.id ?? '',
        mode: mode as GameMode,
        completedAt: Date.now(),
        score,
        starsEarned: totalStars,
      }, user.id)
      await refreshStats()
    } else {
      if (scoreToStars(score) > 0) setShowGuestNudge(true)
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
    navigate(`/songs/${song!.id}`, { state: { tab: 'practice' } })
  }

  const modeLabels: Record<GameMode, string> = {
    'fill-blank': t('game.fillBlank'),
    'fadeout': t('game.fadeout'),
    'line-completion': t('game.lineCompletion'),
    'back-chain': t('game.backChain'),
    'memory-burst': t('game.memoryBurst'),
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
          title={song.title}
          artist={song.artist}
          autoPlay
          onTimeUpdate={setCurrentTime}
          onPlayerReady={setPlayerControls}
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
      {mode === 'back-chain' && (
        <BackChain song={song} onBack={handleBack} onComplete={handleGameComplete} activeLine={activeLine} playerControls={playerControls ?? undefined} />
      )}
      {mode === 'memory-burst' && (
        <MemoryBurst song={song} onBack={handleBack} onComplete={handleGameComplete} activeLine={activeLine} playerControls={playerControls ?? undefined} currentTime={currentTime} />
      )}

      {!['fill-blank', 'fadeout', 'line-completion', 'back-chain', 'memory-burst'].includes(mode ?? '') && (
        <p className="text-muted-foreground text-center">{t('common.notFound')}</p>
      )}

      {showStars && (
        <StarsCounter earned={starsEarned} onDone={() => setShowStars(false)} />
      )}

      {showGuestNudge && (
        <Dialog open onOpenChange={() => setShowGuestNudge(false)}>
          <DialogContent className="max-w-sm text-center">
            <DialogHeader>
              <DialogTitle>Nice work!</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Sign in to save your stars and track your progress.
            </p>
            <div className="flex flex-col gap-2 mt-2">
              <Button asChild><Link to="/auth">Sign In / Create Account</Link></Button>
              <Button variant="ghost" onClick={() => setShowGuestNudge(false)}>Maybe later</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
