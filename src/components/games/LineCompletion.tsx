import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled, { keyframes } from 'styled-components'
import { CheckCircle2, XCircle, ChevronRight, Music2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { saveGameSession } from '@/lib/storage'
import { lyricsDir, isRTL } from '@/lib/rtl'
import type { Song } from '@/types'

interface Props {
  song: Song
  onBack: () => void
  onComplete?: (score: number, sessionId: string) => void
  activeLine?: number
}

function getPrompt(text: string): { prompt: string; answer: string } {
  const words = text.split(' ')
  const promptWords = Math.min(3, Math.floor(words.length / 2))
  return {
    prompt: words.slice(0, promptWords).join(' '),
    answer: words.slice(promptWords).join(' '),
  }
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-zÀ-ɏЀ-ӿ֐-׿\s]/g, '').trim()
}

const pulse = keyframes`0%, 100% { opacity: 1; } 50% { opacity: 0.5; }`

const NowPlayingDot = styled.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary);
  animation: ${pulse} 1s ease-in-out infinite;
  flex-shrink: 0;
`

export function LineCompletion({ song, onBack, onComplete, activeLine = -1 }: Props) {
  const { t } = useTranslation()

  const lines = song.lyrics.filter((l) => l.text.trim().length > 0 && l.text.split(' ').length > 3)
  const [current, setCurrent] = useState(0)
  const [input, setInput] = useState('')
  const [results, setResults] = useState<boolean[]>([])
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState(false)

  if (lines.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        <p>Not enough lyrics to play this mode. Add longer lyrics!</p>
        <Button className="mt-4" variant="outline" onClick={onBack}>
          {t('game.backToSong')}
        </Button>
      </div>
    )
  }

  const line = lines[current]
  const { prompt, answer } = getPrompt(line.text)
  const correctCount = results.filter(Boolean).length
  const score = lines.length > 0 ? Math.round((correctCount / lines.length) * 100) : 0

  // Map the active lyric index (in full song.lyrics) to which game line it is
  const activeGameLineIndex = activeLine >= 0
    ? lines.findIndex((l) => song.lyrics.indexOf(l) === activeLine)
    : -1
  const isCurrentLineNowPlaying = activeGameLineIndex === current

  function checkAnswer() {
    const isCorrect = normalize(input).startsWith(normalize(answer).slice(0, Math.floor(normalize(answer).length * 0.7)))
    setResults((r) => [...r, isCorrect])
    setRevealed(true)
  }

  function nextLine() {
    if (current < lines.length - 1) {
      setCurrent((c) => c + 1)
      setInput('')
      setRevealed(false)
    } else {
      setDone(true)
      const score = Math.round((correctCount / lines.length) * 100)
      const sessionId = crypto.randomUUID()
      saveGameSession({ id: sessionId, songId: song.id, mode: 'line-completion', completedAt: Date.now(), score })
      onComplete?.(score, sessionId)
    }
  }

  function handleReset() {
    setCurrent(0)
    setInput('')
    setResults([])
    setRevealed(false)
    setDone(false)
  }

  if (done) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-8 text-center space-y-3">
          <p className="text-3xl font-bold">{score}%</p>
          <p className="text-muted-foreground">
            {t('game.linesCorrect', { correct: correctCount, total: lines.length })}
          </p>
          <p className="text-sm font-medium">
            {score === 100 ? t('game.perfect') : score >= 80 ? t('game.great') : score >= 50 ? t('game.good') : t('game.keepPracticing')}
          </p>
          <Progress value={score} className="mt-2" />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onBack}>{t('game.backToSong')}</Button>
          <Button onClick={handleReset}>{t('game.tryAgain')}</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{t('game.lineCompletion')}</span>
        <span>{current + 1} / {lines.length}</span>
      </div>

      <Progress value={((current) / lines.length) * 100} />

      <div className="rounded-lg border p-6 space-y-4" dir={lyricsDir(song.language)}>
        {/* Now-playing indicator — shows when background music is at this exact line */}
        {isCurrentLineNowPlaying && (
          <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--primary)' }}>
            <NowPlayingDot />
            <Music2 className="h-3 w-3" />
            now playing
          </div>
        )}

        <div className="text-base font-medium" dir={lyricsDir(song.language)}>
          {isRTL(song.language) ? (
            <>
              <span className="text-muted-foreground">… </span>
              <span className="text-primary">{prompt}</span>
            </>
          ) : (
            <>
              <span className="text-primary">{prompt}</span>{' '}
              <span className="text-muted-foreground">…</span>
            </>
          )}
        </div>

        <Input
          className="text-base"
          placeholder="Complete the line..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !revealed) checkAnswer() }}
          disabled={revealed}
          autoFocus
        />

        {revealed && (
          <div className={`flex items-start gap-2 rounded-md p-3 text-sm ${
            results[results.length - 1] ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {results[results.length - 1] ? (
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
            )}
            <div>
              <span className="font-medium">{results[results.length - 1] ? t('game.correct') : t('game.incorrect')}</span>
              {!results[results.length - 1] && (
                <p className="mt-0.5 opacity-80">
                  <span className="text-primary font-medium">{prompt}</span> {answer}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onBack}>{t('game.backToSong')}</Button>
        {!revealed ? (
          <Button onClick={checkAnswer}>{t('game.check')}</Button>
        ) : (
          <Button onClick={nextLine}>
            {current < lines.length - 1 ? (
              <><ChevronRight className="h-4 w-4" />{t('game.next')}</>
            ) : (
              t('game.finish')
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
