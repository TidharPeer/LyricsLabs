import { useState, useMemo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import styled, { css, keyframes } from 'styled-components'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { saveGameSession } from '@/lib/storage'
import { lyricsDir } from '@/lib/rtl'
import type { Song } from '@/types'

interface Props {
  song: Song
  onBack: () => void
  onComplete?: (score: number, sessionId: string) => void
  activeLine?: number
}

const SKIP_WORDS = new Set(['a', 'an', 'the', 'i', 'is', 'in', 'on', 'at', 'to', 'of', 'it', 'and', 'or', 'but', 'so', 'for', 'as', 'by', 'be', 'do'])

interface Token {
  text: string
  isBlank: boolean
  index: number
}

function tokenizeLyrics(lyrics: Song['lyrics']): Token[][] {
  const allWords: string[] = []
  const lines: string[][] = lyrics.map((l) => {
    const words = l.text.split(/(\s+)/)
    const wordTokens = words.filter((w) => /\S/.test(w))
    allWords.push(...wordTokens)
    return wordTokens
  })

  const eligible = allWords
    .map((w, i) => ({ w: w.replace(/[^a-zA-ZÀ-ɏЀ-ӿ֐-׿]/g, '').toLowerCase(), i }))
    .filter(({ w }) => w.length > 2 && !SKIP_WORDS.has(w))

  const blankCount = Math.ceil(eligible.length * 0.3)
  const shuffled = [...eligible].sort(() => Math.random() - 0.5).slice(0, blankCount)
  const blankIndices = new Set(shuffled.map((e) => e.i))

  let wordPos = 0
  let blankIndex = 0

  return lines.map((words) =>
    words.map((w) => {
      const isBlank = blankIndices.has(wordPos++)
      const tok: Token = { text: w, isBlank, index: isBlank ? blankIndex : -1 }
      if (isBlank) blankIndex++
      return tok
    })
  )
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-zÀ-ɏЀ-ӿ֐-׿]/g, '')
}

const pulse = keyframes`0%, 100% { opacity: 1; } 50% { opacity: 0.7; }`

const LyricRow = styled.div<{ $active?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 0.375rem;
  row-gap: 0.25rem;
  border-inline-start: 3px solid transparent;
  border-radius: 0.25rem;
  padding: 0.4rem 0.75rem;
  transition: border-color 0.2s ease, background 0.2s ease;

  ${({ $active }) => $active && css`
    animation: ${pulse} 1.5s ease-in-out infinite;
    font-weight: 600;
    color: var(--primary);
    background: color-mix(in srgb, var(--primary) 8%, transparent);
    border-inline-start-color: var(--primary);
  `}
`

export function FillInTheBlank({ song, onBack, onComplete, activeLine = -1 }: Props) {
  const { t } = useTranslation()

  const tokenLines = useMemo(() => tokenizeLyrics(song.lyrics), [song.lyrics])
  const blanks = useMemo(
    () => tokenLines.flat().filter((t) => t.isBlank),
    [tokenLines]
  )

  const [answers, setAnswers] = useState<string[]>(() => Array(blanks.length).fill(''))
  const [checked, setChecked] = useState(false)
  const [finished, setFinished] = useState(false)
  const activeLineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    activeLineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeLine])

  const correctCount = blanks.filter(
    (tok, i) => normalize(answers[i]) === normalize(tok.text)
  ).length

  function handleCheck() {
    setChecked(true)
    setFinished(true)
    const score = Math.round((correctCount / blanks.length) * 100)
    const sessionId = crypto.randomUUID()
    saveGameSession({ id: sessionId, songId: song.id, mode: 'fill-blank', completedAt: Date.now(), score })
    onComplete?.(score, sessionId)
  }

  function handleReset() {
    setAnswers(Array(blanks.length).fill(''))
    setChecked(false)
    setFinished(false)
  }

  const score = blanks.length > 0 ? Math.round((correctCount / blanks.length) * 100) : 100

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{t('game.fillBlank')}</span>
        {finished && <span>{t('game.wordsCorrect', { correct: correctCount, total: blanks.length })}</span>}
      </div>

      {finished && (
        <div className="rounded-lg border bg-muted/30 p-4 text-center space-y-1">
          <p className="text-2xl font-bold">{score}%</p>
          <p className="text-sm text-muted-foreground">
            {score === 100 ? t('game.perfect') : score >= 80 ? t('game.great') : score >= 50 ? t('game.good') : t('game.keepPracticing')}
          </p>
          <Progress value={score} className="mt-2" />
        </div>
      )}

      <div className="rounded-lg border max-h-[400px] overflow-y-auto font-medium leading-loose" dir={lyricsDir(song.language)}>
        <div className="p-2 space-y-0.5">
          {tokenLines.map((tokens, li) => {
            const isActive = li === activeLine
            return (
              <LyricRow
                key={li}
                $active={isActive}
                ref={isActive ? (activeLineRef as React.RefObject<HTMLDivElement>) : undefined}
              >
                {tokens.map((tok) => {
                  if (!tok.isBlank) {
                    return <span key={`${li}-${tok.text}-${tok.index}`}>{tok.text}</span>
                  }
                  const idx = tok.index
                  const isCorrect = checked && normalize(answers[idx]) === normalize(tok.text)
                  const isWrong = checked && !isCorrect

                  return (
                    <span key={idx} className="inline-flex items-center gap-1">
                      <Input
                        className={`h-7 w-24 text-sm inline-block px-2 ${
                          isCorrect ? 'border-green-500 text-green-700' : isWrong ? 'border-red-400 text-red-600' : ''
                        }`}
                        value={answers[idx]}
                        onChange={(e) => {
                          const next = [...answers]
                          next[idx] = e.target.value
                          setAnswers(next)
                        }}
                        disabled={checked}
                      />
                      {isCorrect && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                      {isWrong && (
                        <span className="text-xs text-red-500 flex items-center gap-0.5">
                          <XCircle className="h-3 w-3" />
                          {tok.text}
                        </span>
                      )}
                    </span>
                  )
                })}
              </LyricRow>
            )
          })}
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onBack}>{t('game.backToSong')}</Button>
        {!finished ? (
          <Button onClick={handleCheck}>{t('game.check')}</Button>
        ) : (
          <Button onClick={handleReset}>{t('game.tryAgain')}</Button>
        )}
      </div>
    </div>
  )
}
