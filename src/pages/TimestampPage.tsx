import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { getSong } from '@/lib/storage'
import { TimestampEditor } from '@/components/player/TimestampEditor'

export function TimestampPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
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

  if (song.lyrics.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">{t('timestamp.noLyrics')}</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate(`/songs/${song.id}/edit`)}>
          {t('common.edit')}
        </Button>
      </div>
    )
  }

  return <TimestampEditor song={song} />
}
