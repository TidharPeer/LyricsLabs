import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Edit, Clock, Gamepad2 } from 'lucide-react'
import { getSong } from '@/lib/storage'
import { lyricsDir } from '@/lib/rtl'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { KaraokeView } from '@/components/player/KaraokeView'

export function SongDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { user } = useAuth()
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

  const hasTimestamps = song.lyrics.some((l) => l.timestamp !== undefined)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{song.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-muted-foreground">{song.artist}</span>
              <Badge variant="secondary">{t(`languages.${song.language}`, song.language)}</Badge>
              <span className="text-xs text-muted-foreground">
                {t('song.lines', { count: song.lyrics.length })}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/songs/${song.id}/edit`}>
              <Edit className="h-3.5 w-3.5" />
              {t('common.edit')}
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/songs/${song.id}/timestamps`}>
              <Clock className="h-3.5 w-3.5" />
              {t('songDetail.editTimestamps')}
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue={hasTimestamps ? 'karaoke' : 'lyrics'}>
        <TabsList>
          <TabsTrigger value="karaoke">{t('songDetail.karaoke')}</TabsTrigger>
          <TabsTrigger value="lyrics">{t('songDetail.lyrics')}</TabsTrigger>
          <TabsTrigger value="practice">{t('songDetail.practice')}</TabsTrigger>
        </TabsList>

        <TabsContent value="karaoke" className="mt-4">
          <KaraokeView song={song} userId={user?.id} />
        </TabsContent>

        <TabsContent value="lyrics" className="mt-4">
          <div className="rounded-lg border p-4 space-y-0.5 max-h-[500px] overflow-y-auto" dir={lyricsDir(song.language)}>
            {song.lyrics.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">{t('song.noLyrics')}</p>
            ) : (
              song.lyrics.map((line, i) => (
                <div key={line.id} className="group flex items-baseline gap-3 py-0.5">
                  <span className="text-xs text-muted-foreground w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-foreground">{line.text}</p>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="practice" className="mt-4">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Choose a practice mode:</p>
            <Separator />
            {[
              { mode: 'fill-blank', title: t('game.fillBlank'), desc: t('game.fillBlankDesc') },
              { mode: 'fadeout', title: t('game.fadeout'), desc: t('game.fadeoutDesc') },
              { mode: 'line-completion', title: t('game.lineCompletion'), desc: t('game.lineCompletionDesc') },
            ].map(({ mode, title, desc }) => (
              <div
                key={mode}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
                <Button asChild size="sm">
                  <Link to={`/songs/${song.id}/game/${mode}`}>
                    <Gamepad2 className="h-3.5 w-3.5" />
                    {t('game.start')}
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
