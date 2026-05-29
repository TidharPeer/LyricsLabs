import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { fetchSong } from '@/lib/db'
import { TimestampEditor } from '@/components/player/TimestampEditor'
import type { Song } from '@/types'

export function TimestampPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [song, setSong] = useState<Song | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    fetchSong(id).then(s => { setSong(s ?? null); setLoading(false) })
  }, [id])

  if (loading) {
    return <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
  }

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
