import { Link } from 'react-router-dom'
import { Search, Mic2, Gamepad2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { User } from '@supabase/supabase-js'

interface Props {
  query: string
  setQuery: (q: string) => void
  user: User | null
  onDismiss: () => void
}

export function HeroSection({ query, setQuery, user, onDismiss }: Props) {
  return (
    <div className="py-14 sm:py-20 flex flex-col items-center text-center gap-6">
      {/* Branding */}
      <div className="flex items-center gap-3">
        <img src="/favicon.svg" alt="LyricsLabs" className="h-10 w-10" />
        <span className="text-3xl font-bold tracking-tight">LyricsLabs</span>
      </div>

      {/* Tagline */}
      <p className="text-xl sm:text-2xl text-muted-foreground max-w-sm leading-snug">
        Learn every word.<br />Sing every song.
      </p>

      {/* Search */}
      <div className="relative w-full max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-12 h-14 text-base rounded-xl"
          placeholder="Search any song or artist…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {/* Feature callouts */}
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

      {/* CTAs */}
      <div className="flex items-center gap-3 flex-wrap justify-center">
        {!user && (
          <Button asChild>
            <Link to="/auth">Sign In to track progress</Link>
          </Button>
        )}
        <Button
          variant={user ? 'default' : 'outline'}
          onClick={onDismiss}
        >
          {user ? 'Start Exploring →' : 'Explore the Library ↓'}
        </Button>
      </div>
    </div>
  )
}
