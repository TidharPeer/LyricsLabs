import { Link } from 'react-router-dom'
import { Search, Mic2, Gamepad2, Star, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import logoUrl from '@/assets/lyrics_labs_logo.svg'
import type { User } from '@supabase/supabase-js'

interface Props {
  query: string
  setQuery: (q: string) => void
  user: User | null
  onDismiss: () => void
  collapsed: boolean
  placeholder?: string
}

export function HeroSection({ query, setQuery, user, onDismiss, collapsed, placeholder }: Props) {
  return (
    <div className="flex flex-col items-center text-center">

      {/* Top collapsible: branding + tagline */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: collapsed ? '0fr' : '1fr',
          transition: 'grid-template-rows 0.4s ease',
        }}
      >
        <div className="overflow-hidden">
          <div
            className="flex flex-col items-center gap-6 pt-14 sm:pt-20 pb-6"
            style={{ opacity: collapsed ? 0 : 1, transition: 'opacity 0.2s ease' }}
          >
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt="LyricsLabs" className="h-12 w-12 rounded-full" />
              <span className="text-3xl font-bold tracking-tight">LyricsLabs</span>
            </div>
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-sm leading-snug">
              Learn every word.<br />Sing every song.
            </p>
          </div>
        </div>
      </div>

      {/* Search — always visible */}
      <div
        className="w-full"
        style={{
          paddingTop: collapsed ? '1rem' : 0,
          paddingBottom: collapsed ? '0.75rem' : 0,
          transition: 'padding 0.4s ease',
        }}
      >
        <div className="relative w-full max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-12 pr-12 h-14 text-base rounded-xl"
            placeholder={placeholder ?? 'Search any song or artist…'}
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus={!collapsed}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom collapsible: feature callouts + CTAs */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: collapsed ? '0fr' : '1fr',
          transition: 'grid-template-rows 0.4s ease',
        }}
      >
        <div className="overflow-hidden">
          <div
            className="flex flex-col items-center gap-6 pt-6 pb-14 sm:pb-20"
            style={{ opacity: collapsed ? 0 : 1, transition: 'opacity 0.2s ease' }}
          >
            <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap justify-center">
              <span className="flex items-center gap-1.5">
                <Mic2 className="h-4 w-4" /> Karaoke
              </span>
              <span className="text-muted-foreground/30">·</span>
              <span className="flex items-center gap-1.5">
                <Gamepad2 className="h-4 w-4" /> Practice Games
              </span>
              <span className="text-muted-foreground/30">·</span>
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4" /> Earn Stars
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              {!user && (
                <Button asChild>
                  <Link to="/auth">Sign In to track progress</Link>
                </Button>
              )}
              <Button variant={user ? 'default' : 'outline'} onClick={onDismiss}>
                {user ? 'Start Exploring →' : 'Explore the Library ↓'}
              </Button>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
