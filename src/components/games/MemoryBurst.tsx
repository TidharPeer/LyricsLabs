import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, XCircle, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { saveGameSession } from '@/lib/storage'
import { lyricsDir, isRTL } from '@/lib/rtl'
import type { PlayerControls } from '@/components/player/CompactPlayer'
import type { Song } from '@/types'

interface Props {
  song: Song
  onBack: () => void
  onComplete?: (score: number, sessionId: string) => void
  activeLine?: number
  playerControls?: PlayerControls
  currentTime?: number
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-zÀ-ɏЀ-ӿ֐-׿\s]/g, '').trim()
}

export function MemoryBurst({ song, onBack, onComplete, playerControls }: Props) {
  const { t } = useTranslation()

  const lines = useMemo(
    () => song.lyrics.filter(l => l.text.trim().length > 0),
    [song.lyrics]
  )

  const [current, setCurrent] = useState(0)
  const [phase, setPhase] = useState<'reading' | 'typing'>('reading')
  const [input, setInput] = useState('')
  const [results, setResults] = useState<boolean[]>([])
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState(false)
  const [autoAdvancing, setAutoAdvancing] = useState(false)

  // Seek to line start and play when entering reading phase
  useEffect(() => {
    if (phase !== 'reading' || !playerControls || done) return
    const ts = lines[current]?.timestamp
    if (ts !== undefined) {
      playerControls.seekTo(ts)
      playerControls.play()
    }
  }, [current, phase, playerControls, done, lines])

  // Keyboard shortcuts: Enter/Space advance through the game without needing the mouse
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key !== 'Enter' && e.key !== ' ') return
      if (phase === 'reading') {
        e.preventDefault()
        startTyping()
      } else if (phase === 'typing' && revealed && !autoAdvancing) {
        e.preventDefault()
        nextLine()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  // startTyping / nextLine are redefined each render; the relevant state
  // is captured via phase / revealed / autoAdvancing in the dep array
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, revealed, autoAdvancing])

  const isSynced = lines.some(l => l.timestamp !== undefined)

  if (lines.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm space-y-4">
        <p>No lyrics to practice. Add lyrics to this song first!</p>
        <Button variant="outline" onClick={onBack}>{t('game.backToSong')}</Button>
      </div>
    )
  }

  const line = lines[current]
  const answer = line.text
  const correctCount = results.filter(Boolean).length
  const score = lines.length > 0 ? Math.round((correctCount / lines.length) * 100) : 0

  function startTyping() {
    playerControls?.pause()
    setPhase('typing')
  }

  function checkAnswer() {
    const norm = normalize(answer)
    const isCorrect = norm.length > 0 &&
      normalize(input).startsWith(norm.slice(0, Math.floor(norm.length * 0.7)))
    setResults(r => [...r, isCorrect])
    setRevealed(true)
    if (isCorrect) {
      setAutoAdvancing(true)
      setTimeout(() => {
        setAutoAdvancing(false)
        nextLine()
      }, 1000)
    }
  }

  function nextLine() {
    if (current < lines.length - 1) {
      setCurrent(c => c + 1)
      setInput('')
      setRevealed(false)
      setPhase('reading')
    } else {
      setDone(true)
      const sessionId = crypto.randomUUID()
      saveGameSession({ id: sessionId, songId: song.id, mode: 'memory-burst', completedAt: Date.now(), score })
      onComplete?.(score, sessionId)
    }
  }

  function reset() {
    setCurrent(0)
    setInput('')
    setResults([])
    setRevealed(false)
    setPhase('reading')
    setDone(false)
    setAutoAdvancing(false)
  }

  // ── Done screen ──────────────────────────────────────────────────────────────
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
          <Button onClick={reset}>{t('game.tryAgain')}</Button>
        </div>
      </div>
    )
  }

  // ── Main game ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{t('game.memoryBurst')}</span>
        <span>{current + 1} / {lines.length}</span>
      </div>

      <Progress value={(current / lines.length) * 100} />

      {!isSynced && (
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
          Lyrics aren't synced — music won't follow along. Sync timestamps in the song editor for the best experience.
        </p>
      )}

      <div className="rounded-lg border p-6 space-y-4" dir={lyricsDir(song.language)}>
        {phase === 'reading' ? (
          <>
            <p className="text-xs text-muted-foreground">Read this line, then try to recall it:</p>
            <p
              className="text-lg font-medium leading-relaxed"
              dir={lyricsDir(song.language)}
            >
              {answer}
            </p>
            <Button className="w-full" onClick={startTyping}>
              {t('game.gotIt')}
            </Button>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">Type the line from memory:</p>
            <div className="h-8 rounded border-2 border-dashed border-muted flex items-center px-3">
              <span className="text-muted-foreground/40 text-sm select-none">— hidden —</span>
            </div>
            <Input
              className="text-base"
              placeholder={t('game.typeTheLine')}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !revealed) checkAnswer() }}
              disabled={revealed}
              autoFocus
              dir={isRTL(song.language) ? 'rtl' : 'ltr'}
            />

            {revealed && (
              <div className={`flex items-start gap-2 rounded-md p-3 text-sm ${
                results[results.length - 1]
                  ? 'bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300'
                  : 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300'
              }`}>
                {results[results.length - 1] ? (
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
                )}
                <div>
                  <span className="font-medium">
                    {results[results.length - 1] ? t('game.correct') : t('game.incorrect')}
                  </span>
                  {!results[results.length - 1] && (
                    <p className="mt-0.5 opacity-80">{answer}</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onBack}>{t('game.backToSong')}</Button>
        {phase === 'typing' && !revealed && (
          <Button onClick={checkAnswer}>{t('game.check')}</Button>
        )}
        {revealed && !autoAdvancing && (
          <Button onClick={nextLine}>
            {current < lines.length - 1
              ? <><ChevronRight className="h-4 w-4" />{t('game.next')}</>
              : t('game.finish')
            }
          </Button>
        )}
        {autoAdvancing && (
          <span className="text-sm text-muted-foreground self-center">Continuing…</span>
        )}
      </div>
    </div>
  )
}
