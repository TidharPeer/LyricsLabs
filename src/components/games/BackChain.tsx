import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { saveGameSession } from '@/lib/storage'
import { lyricsDir } from '@/lib/rtl'
import type { PlayerControls } from '@/components/player/CompactPlayer'
import type { Song } from '@/types'

interface Props {
  song: Song
  onBack: () => void
  onComplete?: (score: number, sessionId: string) => void
  activeLine?: number
  playerControls?: PlayerControls
}

const CHUNK_SIZE = 4
const QUIZ_COUNT = 5
const SKIP = new Set([
  'a','an','the','i','is','in','on','at','to','of','it','and','or','but','so',
  'for','as','by','be','do','me','my','you','we','he','she','they','us','not',
  'no','up','out','if','its','this','that','with','was','are','have','had',
])

interface QuizItem {
  context: string   // line text with blank word replaced by "___"
  answer: string    // cleaned lowercase word to guess
  original: string  // original word for display on reveal
}

function buildQuiz(lyrics: Song['lyrics'], count: number): QuizItem[] {
  const candidates: QuizItem[] = []
  lyrics.forEach(line => {
    if (!line.text.trim()) return
    const words = line.text.split(/\s+/)
    words.forEach((word, idx) => {
      const clean = word.replace(/[^a-zA-ZÀ-ɏЀ-ӿ֐-׿]/g, '').toLowerCase()
      if (clean.length > 3 && !SKIP.has(clean)) {
        const ctx = words.map((w, j) => j === idx ? '___' : w).join(' ')
        candidates.push({ context: ctx, answer: clean, original: word })
      }
    })
  })
  return [...candidates].sort(() => Math.random() - 0.5).slice(0, Math.min(count, candidates.length))
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-zÀ-ɏЀ-ӿ֐-׿]/g, '').trim()
}

export function BackChain({ song, onBack, onComplete, playerControls }: Props) {
  const { t } = useTranslation()

  const chunks = useMemo(() => {
    const lines = song.lyrics.filter(l => l.text.trim().length > 0)
    const result = []
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
      result.push(lines.slice(i, i + CHUNK_SIZE))
    }
    return result
  }, [song.lyrics])

  const [step, setStep] = useState(0)
  const [phase, setPhase] = useState<'reveal' | 'quiz' | 'done'>('reveal')

  // Seek to the starting chunk when the player becomes ready
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!playerControls) return
    const ts = chunks[chunks.length - 1]?.[0]?.timestamp
    if (ts !== undefined) {
      playerControls.seekTo(ts)
      playerControls.play()
    }
  }, [playerControls])

  const [quiz, setQuiz] = useState<QuizItem[]>([])
  const [inputs, setInputs] = useState<string[]>([])
  const [checked, setChecked] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [finalCorrect, setFinalCorrect] = useState(0)

  if (chunks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm space-y-4">
        <p>No lyrics to practice. Add lyrics to this song first!</p>
        <Button variant="outline" onClick={onBack}>{t('game.backToSong')}</Button>
      </div>
    )
  }

  const totalChunks = chunks.length
  // At step k, show chunks from index (totalChunks-1-k) to end (in song order)
  const newChunkIndex = totalChunks - 1 - step

  function advance() {
    if (step < totalChunks - 1) {
      // The chunk being added is one earlier than the current new chunk
      const nextNewChunkIndex = newChunkIndex - 1
      const ts = chunks[nextNewChunkIndex]?.[0]?.timestamp
      if (ts !== undefined) {
        playerControls?.seekTo(ts)
        playerControls?.play()
      }
      setStep(s => s + 1)
    } else {
      const q = buildQuiz(song.lyrics, QUIZ_COUNT)
      setQuiz(q)
      setInputs(q.map(() => ''))
      setChecked(false)
      setPhase('quiz')
    }
  }

  function checkQuiz() {
    setChecked(true)
  }

  function finish() {
    const correct = quiz.filter((q, i) => normalize(inputs[i]) === q.answer).length
    const score = quiz.length > 0 ? Math.round((correct / quiz.length) * 100) : 100
    setFinalCorrect(correct)
    setFinalScore(score)
    const sessionId = crypto.randomUUID()
    saveGameSession({ id: sessionId, songId: song.id, mode: 'back-chain', completedAt: Date.now(), score })
    setPhase('done')
    onComplete?.(score, sessionId)
  }

  function reset() {
    setStep(0)
    setPhase('reveal')
    setQuiz([])
    setInputs([])
    setChecked(false)
  }

  const isSynced = song.lyrics.some(l => l.timestamp !== undefined)

  // ── Reveal phase ────────────────────────────────────────────────────────────
  if (phase === 'reveal') {
    const visibleChunks = chunks.slice(newChunkIndex) // song-order slice

    return (
      <div className="space-y-4">
        <p className="text-xs text-center text-muted-foreground/80 italic">
          Learn from the end — each round adds earlier lyrics to the top.
        </p>

        {!isSynced && (
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
            Lyrics aren't synced — music won't follow along. Sync timestamps in the song editor for the best experience.
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('game.backChain')}</span>
          <Badge variant="outline">{step + 1} / {totalChunks}</Badge>
        </div>

        <Progress value={(step / Math.max(totalChunks - 1, 1)) * 100} />

        <div
          className="rounded-lg border max-h-[420px] overflow-y-auto divide-y"
          dir={lyricsDir(song.language)}
        >
          {visibleChunks.map((chunk, offset) => {
            const isNew = offset === 0
            return (
              <div
                key={chunk[0].id}
                className={isNew
                  ? 'px-4 py-3 bg-primary/5 border-l-[3px] border-l-primary'
                  : 'px-4 py-3'}
              >
                {chunk.map(line => (
                  <p
                    key={line.id}
                    className={`py-0.5 text-sm leading-relaxed ${
                      isNew ? 'font-medium text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {line.text}
                  </p>
                ))}
              </div>
            )
          })}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onBack}>{t('game.backToSong')}</Button>
          <Button onClick={advance}>
            {step < totalChunks - 1 ? '← Add earlier lines' : 'Start Quiz →'}
          </Button>
        </div>
      </div>
    )
  }

  // ── Quiz phase ───────────────────────────────────────────────────────────────
  if (phase === 'quiz') {
    const results = quiz.map((q, i) => normalize(inputs[i]) === q.answer)
    const correctCount = results.filter(Boolean).length

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('game.backChain')} — Final Quiz</span>
          <Badge variant="outline">{quiz.length} words</Badge>
        </div>

        <p className="text-xs text-muted-foreground">
          Fill in the missing words:
        </p>

        <div className="space-y-3">
          {quiz.map((item, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-medium" dir={lyricsDir(song.language)}>
                {item.context}
              </p>
              <div className="flex items-center gap-2">
                <Input
                  className="text-sm"
                  placeholder="Missing word…"
                  value={inputs[i]}
                  onChange={e => {
                    const next = [...inputs]
                    next[i] = e.target.value
                    setInputs(next)
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && !checked) checkQuiz() }}
                  disabled={checked}
                />
                {checked && (
                  results[i]
                    ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    : <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                )}
              </div>
              {checked && !results[i] && (
                <p className="text-xs text-red-500">
                  Answer: <span className="font-medium">{item.original}</span>
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onBack}>{t('game.backToSong')}</Button>
          {!checked
            ? <Button onClick={checkQuiz}>{t('game.check')}</Button>
            : <Button onClick={finish}>{t('game.finish')} ({correctCount}/{quiz.length})</Button>
          }
        </div>
      </div>
    )
  }

  // ── Done phase ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-8 text-center space-y-3">
        <p className="text-3xl font-bold">{finalScore}%</p>
        <p className="text-muted-foreground">
          {finalCorrect} / {quiz.length} words correct
        </p>
        <p className="text-sm font-medium">
          {finalScore === 100 ? t('game.perfect') : finalScore >= 80 ? t('game.great') : finalScore >= 50 ? t('game.good') : t('game.keepPracticing')}
        </p>
        <Progress value={finalScore} className="mt-2" />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onBack}>{t('game.backToSong')}</Button>
        <Button onClick={reset}>{t('game.tryAgain')}</Button>
      </div>
    </div>
  )
}
