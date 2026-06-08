import { useState } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Music2, ListMusic, Plus } from 'lucide-react'
import { UserMenu } from './UserMenu'
import { YouTubeSearchDialog } from '@/components/songs/YouTubeSearchDialog'
import { LyricsLabLogo } from '@/components/LyricsLabLogo'
import { useAuthUser } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

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

          {!isAuth && user && (
            <nav className="flex items-center gap-1 rounded-lg bg-muted p-1">
              <Link
                to="/"
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2 sm:px-3 py-1.5 text-sm font-medium transition-colors',
                  location.pathname === '/'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Music2 className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{t('playlist.songs')}</span>
              </Link>
              <Link
                to="/playlists"
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2 sm:px-3 py-1.5 text-sm font-medium transition-colors',
                  location.pathname === '/playlists'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <ListMusic className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{t('playlist.playlists')}</span>
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
            {!isAuth && <UserMenu />}
          </div>
        </div>
      </header>
      <main className="container py-6"><Outlet /></main>
      {user && <YouTubeSearchDialog open={addSongOpen} onOpenChange={setAddSongOpen} />}
      <footer className="border-t mt-8 py-4">
        <div className="container flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} LyricsLabs</span>
          <span className="hidden sm:inline">·</span>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </div>
  )
}
