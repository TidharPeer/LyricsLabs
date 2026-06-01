import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Music2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { handleReferral } from '@/lib/db'

export function AuthPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, signUp, signIn, signInWithGoogle, resetPassword, updatePassword } = useAuth()

  const isReset = searchParams.get('reset') === 'true'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const refCode = searchParams.get('ref') ?? ''

  // Redirect if already signed in (but not if we're in reset mode)
  useEffect(() => {
    if (user && !isReset) navigate('/', { replace: true })
  }, [user, navigate, isReset])

  async function handleSignUp() {
    setError('')
    setLoading(true)
    const { error: err } = await signUp(email, password)
    setLoading(false)
    if (err) { setError(err); return }
    if (refCode) {
      setTimeout(async () => {
        const { data } = await import('@/lib/supabase').then(m => m.supabase.auth.getUser())
        if (data.user) await handleReferral(refCode, data.user.id)
      }, 1000)
    }
    setSuccessMsg(t('auth.checkEmail'))
  }

  async function handleSignIn() {
    setError('')
    setLoading(true)
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) setError(err)
  }

  async function handleGoogle() {
    setError('')
    const { error: err } = await signInWithGoogle()
    if (err) setError(err)
  }

  async function handleForgotPassword() {
    if (!email) { setError(t('auth.enterEmailFirst')); return }
    setError('')
    setLoading(true)
    const { error: err } = await resetPassword(email)
    setLoading(false)
    if (err) setError(err)
    else setSuccessMsg(t('auth.resetEmailSent'))
  }

  async function handleSetNewPassword() {
    if (!newPassword) return
    setError('')
    setLoading(true)
    const { error: err } = await updatePassword(newPassword)
    setLoading(false)
    if (err) { setError(err); return }
    setSuccessMsg(t('auth.passwordUpdated'))
    setTimeout(() => navigate('/', { replace: true }), 1500)
  }

  // ── Reset-password form ────────────────────────────────────────────────────
  if (isReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <Music2 className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">{t('auth.resetPasswordTitle')}</h1>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t('auth.newPassword')}</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSetNewPassword()}
                  className="pr-9"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowNewPassword(v => !v)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}
            {successMsg && <p className="text-xs text-green-600">{successMsg}</p>}

            <Button
              className="w-full"
              onClick={handleSetNewPassword}
              disabled={loading || !newPassword}
            >
              {loading ? t('common.loading') : t('auth.setNewPassword')}
            </Button>

            <button
              type="button"
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => navigate('/auth', { replace: true })}
            >
              {t('auth.backToSignIn')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Normal sign-in / sign-up form ─────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <Music2 className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{t('app.name')}</h1>
          <p className="text-sm text-muted-foreground">{t('app.tagline')}</p>
        </div>

        {/* Google */}
        <Button variant="outline" className="w-full gap-2" onClick={handleGoogle}>
          <GoogleIcon />
          {t('auth.continueWithGoogle')}
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex-1 border-t" />
          <span className="text-xs text-muted-foreground">{t('auth.or')}</span>
          <div className="flex-1 border-t" />
        </div>

        {/* Email / password */}
        <Tabs defaultValue="signin">
          <TabsList className="w-full">
            <TabsTrigger value="signin" className="flex-1">{t('auth.signIn')}</TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">{t('auth.signUp')}</TabsTrigger>
          </TabsList>

          {(['signin', 'signup'] as const).map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <Label>{t('auth.email')}</Label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (tab === 'signin' ? handleSignIn() : handleSignUp())}
                />
              </div>

              <div className="space-y-1.5">
                <Label>{t('auth.password')}</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (tab === 'signin' ? handleSignIn() : handleSignUp())}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(v => !v)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}
              {successMsg && <p className="text-xs text-green-600">{successMsg}</p>}

              <Button
                className="w-full"
                onClick={tab === 'signin' ? handleSignIn : handleSignUp}
                disabled={loading || !email || !password}
              >
                {loading ? t('common.loading') : tab === 'signin' ? t('auth.signIn') : t('auth.signUp')}
              </Button>

              {tab === 'signin' && (
                <button
                  type="button"
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={handleForgotPassword}
                  disabled={loading}
                >
                  {t('auth.forgotPassword')}
                </button>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
