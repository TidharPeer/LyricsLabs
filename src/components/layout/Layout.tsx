import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Music } from 'lucide-react'
import { UserMenu } from './UserMenu'

export function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const location = useLocation()
  const isAuth = location.pathname === '/auth'

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Music className="h-5 w-5 text-primary" />
            <span>{t('app.name')}</span>
          </Link>
          {!isAuth && <UserMenu />}
        </div>
      </header>
      <main className="container py-6">{children}</main>
    </div>
  )
}
