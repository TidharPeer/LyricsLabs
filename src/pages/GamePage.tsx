import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { getSong } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { CompactPlayer } from '@/components/player/CompactPlayer'
import { FillInTheBlank } from '@/components/games/FillInTheBlank'
import { FadeOutChallenge } from '@/components/games/FadeOutChallenge'
import { LineCompletion } from '@/components/games/LineCompletion'
import type { GameMode } from '@/types'

export function GamePage() {
  const { t } = useTranslation()
  const { id, mode } = useParams<{ id: string; mode: string }>()
  const navigate = useNavigate()

  const song = id ? getSong(id) : undefined

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
        />
      )}

      {mode === 'fill-blank' && <FillInTheBlank song={song} onBack={handleBack} />}
      {mode === 'fadeout' && <FadeOutChallenge song={song} onBack={handleBack} />}
      {mode === 'line-completion' && <LineCompletion song={song} onBack={handleBack} />}

      {!['fill-blank', 'fadeout', 'line-completion'].includes(mode ?? '') && (
        <p className="text-muted-foreground text-center">{t('common.notFound')}</p>
      )}
    </div>
  )
}
