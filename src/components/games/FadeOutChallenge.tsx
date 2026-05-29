import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import styled, { css, keyframes } from 'styled-components'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { saveGameSession } from '@/lib/storage'
import { lyricsDir } from '@/lib/rtl'
import type { Song } from '@/types'

interface Props {
  song: Song
  onBack: () => void
  onComplete?: (score: number, sessionId: string) => void
  activeLine?: number
}

type Visibility = 'full' | 'alternate' | 'first-words' | 'blank'

const ROUNDS: Visibility[] = ['full', 'alternate', 'first-words', 'blank']

const pulse = keyframes`0%, 100% { opacity: 1; } 50% { opacity: 0.7; }`
const fadeAnim = keyframes`from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; }`

const LineText = styled.p<{ $dim: boolean; $active: boolean }>`
  border-inline-start: 3px solid transparent;
  border-radius: 0.25rem;
  padding: 0.3rem 0.75rem;
  transition: border-color 0.2s ease, background 0.2s ease;
  animation: ${fadeAnim} 0.3s ease;

  ${({ $dim, $active }) => $dim && !$active && css`
    color: var(--muted-foreground);
    opacity: 0.4;
  `}

  ${({ $active }) => $active && css`
    animation: ${pulse} 1.5s ease-in-out infinite;
    font-weight: 600;
    color: var(--primary);
    background: color-mix(in srgb, var(--primary) 8%, transparent);
    border-inline-start-color: var(--primary);
    opacity: 1;
  `}
`

function renderLine(text: string, visibility: Visibility, lineIndex: number): string {
  switch (visibility) {
    case 'full':
      return text
    case 'alternate':
      return lineIndex % 2 === 0 ? text : '― ― ― ― ―'
    case 'first-words': {
      const words = text.split(' ')
      const show = Math.min(2, words.length)
      return words.slice(0, show).join(' ') + (words.length > show ? ' …' : '')
    }
    case 'blank':
      return '― ― ― ― ―'
  }
}

export function FadeOutChallenge({ song, onBack, onComplete, activeLine = -1 }: Props) {
  const { t } = useTranslation()
  const [roundIndex, setRoundIndex] = useState(0)
  const [finished, setFinished] = useState(false)
  const activeLineRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    activeLineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeLine])

  const round = ROUNDS[roundIndex]
  const totalRounds = ROUNDS.length

  function nextRound() {
    if (roundIndex < totalRounds - 1) {
      setRoundIndex((r) => r + 1)
    } else {
      setFinished(true)
      const score = Math.round(((roundIndex + 1) / totalRounds) * 100)
      const sessionId = crypto.randomUUID()
      saveGameSession({ id: sessionId, songId: song.id, mode: 'fadeout', completedAt: Date.now(), score })
      onComplete?.(score, sessionId)
    }
  }

  function handleReset() {
    setRoundIndex(0)
    setFinished(false)
  }

  const roundLabels: Record<Visibility, string> = {
    full: 'Full lyrics',
    alternate: 'Every other line hidden',
    'first-words': 'First words only',
    blank: 'All hidden — recite!',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{t('game.fadeout')}</span>
        <Badge variant="outline">
          {t('game.round', { round: roundIndex + 1, total: totalRounds })}
        </Badge>
      </div>

      <Progress value={((roundIndex) / (totalRounds - 1)) * 100} />

      <div className="text-xs font-medium text-center text-muted-foreground">
        {roundLabels[round]}
      </div>

      {finished ? (
        <div className="rounded-lg border bg-muted/30 p-6 text-center space-y-2">
          <p className="text-2xl font-bold">100%</p>
          <p className="text-sm text-muted-foreground">{t('game.perfect')}</p>
          <p className="text-sm text-muted-foreground">You completed all 4 rounds!</p>
        </div>
      ) : (
        <div className="rounded-lg border max-h-[400px] overflow-y-auto font-medium leading-relaxed" dir={lyricsDir(song.language)}>
          <div className="py-2">
            {song.lyrics.map((line, i) => {
              const rendered = renderLine(line.text, round, i)
              const isDim = rendered.startsWith('―')
              const isActive = i === activeLine
              return (
                <LineText
                  key={line.id}
                  $dim={isDim}
                  $active={isActive}
                  ref={isActive ? (activeLineRef as React.RefObject<HTMLParagraphElement>) : undefined}
                  className="text-sm"
                >
                  {rendered}
                </LineText>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onBack}>{t('game.backToSong')}</Button>
        {!finished ? (
          <Button onClick={nextRound}>
            {roundIndex < totalRounds - 1 ? t('game.nextRound') : t('game.finish')}
          </Button>
        ) : (
          <Button onClick={handleReset}>{t('game.tryAgain')}</Button>
        )}
      </div>
    </div>
  )
}
