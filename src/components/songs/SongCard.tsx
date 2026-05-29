import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Music2, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Song } from '@/types'

interface Props {
  song: Song
}

export function SongCard({ song }: Props) {
  const { t } = useTranslation()

  return (
    <Link to={`/songs/${song.id}`}>
      <Card className="transition-colors hover:bg-muted/50 cursor-pointer">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Music2 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{song.title}</p>
            <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className="hidden sm:flex">
              {t(`languages.${song.language}`, song.language)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {t('song.lines', { count: song.lyrics.length })}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
