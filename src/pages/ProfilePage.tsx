import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Star, Flame, Copy, Check, Music2, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { getUserStats, getRecentSessions, getReferralLink } from '@/lib/db'
import { getSong } from '@/lib/storage'
import type { UserStats, GameSession } from '@/types'

const MODE_LABEL: Record<string, string> = {
  'fill-blank': 'Fill in the Blank',
  'fadeout': 'Fade-Out',
  'line-completion': 'Line Completion',
}

export function ProfilePage() {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [stats, setStats] = useState<UserStats | null>(null)
  const [sessions, setSessions] = useState<GameSession[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!user) { navigate('/auth', { replace: true }); return }
    getUserStats(user.id).then(setStats)
    getRecentSessions(user.id, 10).then(setSessions)
  }, [user, navigate])

  if (!user) return null

  const shareLink = getReferralLink(user.id)

  async function copyLink() {
    await navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{t('profile.title')}</h1>
      </div>

      {/* Identity */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
          {(user.email ?? 'U').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="font-medium">{user.email}</p>
          <p className="text-xs text-muted-foreground">
            Member since {new Date(user.created_at ?? Date.now()).toLocaleDateString()}
          </p>
        </div>
      </div>

      <Separator />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <Star className="h-5 w-5 text-amber-500 fill-amber-400 mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats.stars}</p>
              <p className="text-xs text-muted-foreground">{t('profile.stars')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Flame className="h-5 w-5 text-orange-500 fill-orange-400 mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats.streakCurrent}</p>
              <p className="text-xs text-muted-foreground">{t('profile.streak')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Flame className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats.streakBest}</p>
              <p className="text-xs text-muted-foreground">{t('profile.bestStreak')}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Share */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t('profile.shareLink')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Share LyricLab with friends — you earn <strong>10 ★</strong> when they sign up, they get <strong>5 ★</strong> welcome bonus.
          </p>
          <div className="flex gap-2">
            <code className="flex-1 rounded-md border bg-muted px-3 py-1.5 text-xs truncate">
              {shareLink}
            </code>
            <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={copyLink}>
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? t('profile.copied') : 'Copy'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {theme === 'dark' ? 'Dark mode' : 'Light mode'}
            </span>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              {theme === 'dark'
                ? <><Sun className="h-4 w-4" /> Switch to light</>
                : <><Moon className="h-4 w-4" /> Switch to dark</>}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Recent games */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t('profile.recentGames')}</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('profile.noGames')}</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => {
                const song = getSong(s.songId)
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Music2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {song ? `${song.title} — ${song.artist}` : 'Unknown song'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {MODE_LABEL[s.mode] ?? s.mode}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <Progress value={s.score} className="w-16 h-1.5 mb-1" />
                      <p className="text-xs text-muted-foreground">{s.score}%</p>
                    </div>
                    {(s.starsEarned ?? 0) > 0 && (
                      <Badge variant="secondary" className="text-amber-600 bg-amber-50 shrink-0">
                        +{s.starsEarned} ★
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-between items-center">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to songs
        </Link>
        <Button variant="outline" size="sm" onClick={() => { signOut(); navigate('/') }}>
          {t('auth.signOut')}
        </Button>
      </div>
    </div>
  )
}
