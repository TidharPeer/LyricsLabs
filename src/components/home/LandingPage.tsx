import { Link } from 'react-router-dom'
import { Mic2, Gamepad2, Star, CalendarCheck, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DiscoverSection } from '@/components/home/DiscoverSection'

export function LandingPage() {
  return (
    <div className="space-y-14 pb-8">

      {/* How it works */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-center">How it works</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { n: 1, title: 'Add any song', desc: 'Paste a YouTube link or search for any song to build your library' },
            { n: 2, title: 'Practice with games', desc: '5 different practice modes train your memory — fill-in-the-blank, fade-out, and more' },
            { n: 3, title: 'Earn stars & streaks', desc: 'Score stars every game, maintain a daily streak, and master your favorites' },
          ].map(({ n, title, desc }) => (
            <div key={n} className="flex flex-col items-center gap-3 rounded-xl border bg-card p-5 text-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                {n}
              </div>
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { Icon: Mic2, title: 'Karaoke Sync', desc: 'Lyrics highlighted in real-time as the song plays — sing along perfectly' },
          { Icon: Gamepad2, title: '5 Practice Games', desc: 'Fill blanks, fade-out, line completion, back-chain, and memory burst' },
          { Icon: Star, title: 'Streaks & Stars', desc: 'Earn stars for every game and keep your daily practice streak alive' },
          { Icon: CalendarCheck, title: 'Concert Prep', desc: 'Import a setlist and practice every song before the show' },
        ].map(({ Icon, title, desc }) => (
          <div key={title} className="rounded-xl border bg-card p-5 space-y-2">
            <Icon className="h-6 w-6 text-primary" />
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* Discover — playable without an account */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Try it now — no account needed</p>
        <DiscoverSection />
      </div>

      {/* Bottom CTA */}
      <div className="flex flex-col items-center gap-4 rounded-xl border bg-muted/30 py-10 px-6 text-center">
        <p className="text-xl font-bold">Ready to start?</p>
        <p className="text-sm text-muted-foreground">Free forever. No credit card needed.</p>
        <Button asChild size="lg" className="gap-1.5">
          <Link to="/auth">
            Sign Up Free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

    </div>
  )
}
