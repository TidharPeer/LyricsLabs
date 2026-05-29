import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Music, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserMenu } from './UserMenu'
import { useAuth } from '@/contexts/AuthContext'

export function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const location = useLocation()
  const { user } = useAuth()
  const isHome = location.pathname === '/'
  const isAuth = location.pathname === '/auth'

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Music className="h-5 w-5 text-primary" />
            <span>{t('app.name')}</span>
          </Link>

          <div className="flex items-center gap-2">
            {isHome && user && (
              <Button asChild size="sm">
                <Link to="/songs/new">
                  <Plus className="h-4 w-4" />
                  {t('nav.addSong')}
                </Link>
              </Button>
            )}
            {!isAuth && <UserMenu />}
          </div>
        </div>
      </header>
      <main className="container py-6">{children}</main>
    </div>
  )
}
