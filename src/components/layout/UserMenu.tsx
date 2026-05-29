import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { User, LogOut, Star, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { getUserStats } from '@/lib/db'
import type { UserStats } from '@/types'

export function UserMenu() {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!user) { setStats(null); return }
    getUserStats(user.id).then(setStats)
  }, [user])

  if (!user) {
    return (
      <Button size="sm" asChild>
        <Link to="/auth">{t('auth.signIn')}</Link>
      </Button>
    )
  }

  const initials = (user.email ?? 'U').slice(0, 2).toUpperCase()

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-muted transition-colors"
      >
        {/* Stars */}
        {stats !== null && (
          <span className="flex items-center gap-0.5 text-xs font-medium text-amber-500">
            <Star className="h-3.5 w-3.5 fill-amber-500" />
            {stats.stars}
          </span>
        )}
        {/* Streak */}
        {stats !== null && stats.streakCurrent > 0 && (
          <span className="flex items-center gap-0.5 text-xs font-medium text-orange-500">
            <Flame className="h-3.5 w-3.5 fill-orange-400" />
            {stats.streakCurrent}
          </span>
        )}
        {/* Avatar */}
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
          {initials}
        </span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1 z-40 w-44 rounded-lg border bg-popover shadow-md py-1">
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left"
              onClick={() => { navigate('/'); setOpen(false) }}
            >
              <User className="h-4 w-4" />
              {t('auth.mySongs')}
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left"
              onClick={() => { navigate('/profile'); setOpen(false) }}
            >
              <Star className="h-4 w-4" />
              {t('auth.profile')}
            </button>
            <div className="border-t my-1" />
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left text-muted-foreground"
              onClick={() => { signOut(); setOpen(false) }}
            >
              <LogOut className="h-4 w-4" />
              {t('auth.signOut')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
