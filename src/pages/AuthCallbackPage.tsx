import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const handle = async () => {
      // PKCE flow: code in query string
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) { setError(error.message); return }
        navigate('/', { replace: true })
        return
      }

      // Implicit flow: access_token in hash — Supabase fires onAuthStateChange
      const hash = window.location.hash
      if (hash.includes('access_token')) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
          if (session) {
            subscription.unsubscribe()
            navigate('/', { replace: true })
          }
        })
        // Safety timeout: if we never get a session, go back to /auth
        const timer = setTimeout(() => {
          subscription.unsubscribe()
          navigate('/auth', { replace: true })
        }, 8000)
        return () => { subscription.unsubscribe(); clearTimeout(timer) }
      }

      // No recognised token — probably a stale or direct URL visit
      navigate('/auth', { replace: true })
    }

    handle()
  }, [navigate])

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-sm">
        <p className="text-destructive">{error}</p>
        <button className="underline text-muted-foreground" onClick={() => navigate('/auth')}>
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground text-sm">
      <Loader2 className="h-6 w-6 animate-spin" />
      Signing you in…
    </div>
  )
}
