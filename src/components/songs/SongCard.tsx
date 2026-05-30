import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Music2, ChevronRight, Trash2, CheckCircle2, FileText, MinusCircle, Play, Pencil } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Song } from '@/types'

interface Props {
  song: Song
  onDelete?: () => void
  onEdit?: () => void
}

export function SongCard({ song, onDelete, onEdit }: Props) {
  const { t } = useTranslation()
  const hasSynced = song.lyrics.some(l => l.timestamp !== undefined)
  const hasLyrics = song.lyrics.length > 0

  return (
    <Link to={`/songs/${song.id}`} className="group block">
      <Card className="transition-colors hover:bg-muted/50 cursor-pointer">
        <CardContent className="flex items-center gap-4 p-4">
          {/* Left icon: Music note → Play on hover */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Music2 className="h-5 w-5 text-primary group-hover:hidden" />
            <Play className="h-5 w-5 text-primary hidden group-hover:block" />
          </div>

          {/* Title + inline edit icon */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-medium truncate">{song.title}</p>
              {onEdit && (
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); onEdit() }}
                  className="hidden group-hover:inline-flex shrink-0 items-center justify-center rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  title="Edit song"
                  aria-label="Edit song"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className="hidden sm:flex">
              {t(`languages.${song.language}`, song.language)}
            </Badge>

            {hasSynced ? (
              <Badge
                variant="outline"
                className="hidden sm:flex gap-1 text-xs text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30 dark:text-green-400"
              >
                <CheckCircle2 className="h-3 w-3" /> Synced
              </Badge>
            ) : hasLyrics ? (
              <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                {t('song.lines', { count: song.lyrics.length })}
              </span>
            ) : (
              <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                <MinusCircle className="h-3 w-3" /> No lyrics
              </span>
            )}

            {onDelete && (
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete() }}
                className="hidden group-hover:flex rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Delete song"
                aria-label="Delete song"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
