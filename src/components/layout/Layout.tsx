import { useState } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Music2, ListMusic, Plus, Mic2, Coffee } from 'lucide-react'
import { UserMenu } from './UserMenu'
import { YouTubeSearchDialog } from '@/components/songs/YouTubeSearchDialog'
import { LyricsLabLogo } from '@/components/LyricsLabLogo'
import { useAuthUser } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

function NavItem({ to, active, icon, label }: { to: string; active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors',
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {icon}
      {label}
    </Link>
  )
}

export function Layout() {
  const { t } = useTranslation()
  const { user } = useAuthUser()
  const location = useLocation()
  const [addSongOpen, setAddSongOpen] = useState(false)
  const isAuth = location.pathname === '/auth'
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between gap-4">
          <Link to="/" className="flex shrink-0 items-center gap-2 font-semibold">
            <LyricsLabLogo className="h-7 w-7 text-primary" />
            <span>{t('app.name')}</span>
          </Link>

          {!isAuth && (
            <nav className="hidden sm:flex items-center gap-1 rounded-lg bg-muted p-1">
              <Link
                to="/"
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  location.pathname === '/'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Music2 className="h-3.5 w-3.5 shrink-0" />
                {t('playlist.songs')}
              </Link>
              {user && (
                <Link
                  to="/playlists"
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    location.pathname === '/playlists'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <ListMusic className="h-3.5 w-3.5 shrink-0" />
                  {t('playlist.playlists')}
                </Link>
              )}
              <Link
                to="/concerts"
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  location.pathname === '/concerts' || location.pathname === '/concerts/past'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Mic2 className="h-3.5 w-3.5 shrink-0" />
                Concerts
              </Link>
            </nav>
          )}

          <div className="flex items-center gap-2">
            {!isAuth && user && (
              <button
                onClick={() => setAddSongOpen(true)}
                className="hidden sm:flex items-center justify-center h-8 w-8 rounded-full border hover:bg-muted transition-colors"
                title={t('nav.addSong')}
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
            {!isAuth && import.meta.env.VITE_SUPPORT_URL && (
              <a
                href={import.meta.env.VITE_SUPPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                title="Buy me a coffee"
                className="flex items-center justify-center h-8 w-8 rounded-full border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <Coffee className="h-4 w-4" />
              </a>
            )}
            {!isAuth && <UserMenu />}
          </div>
        </div>
      </header>
      <main className="container py-6 pb-24 sm:pb-6"><Outlet /></main>
      {user && <YouTubeSearchDialog open={addSongOpen} onOpenChange={setAddSongOpen} />}
      <footer className="border-t mt-8 py-4 hidden sm:block">
        <div className="container flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} LyricsLabs</span>
          <span>·</span>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          {import.meta.env.VITE_SUPPORT_URL && (
            <>
              <span>·</span>
              <a
                href={import.meta.env.VITE_SUPPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Coffee className="h-3 w-3" />
                Buy me a coffee
              </a>
            </>
          )}
        </div>
      </footer>

      {!isAuth && (
        <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur">
          <div className="flex items-stretch">
            <NavItem
              to="/"
              active={location.pathname === '/'}
              icon={<Music2 className="h-5 w-5" />}
              label={t('playlist.songs')}
            />
            {user && (
              <NavItem
                to="/playlists"
                active={location.pathname === '/playlists'}
                icon={<ListMusic className="h-5 w-5" />}
                label={t('playlist.playlists')}
              />
            )}
            <NavItem
              to="/concerts"
              active={location.pathname === '/concerts' || location.pathname === '/concerts/past'}
              icon={<Mic2 className="h-5 w-5" />}
              label="Concerts"
            />
          </div>
        </nav>
      )}
    </div>
  )
}
