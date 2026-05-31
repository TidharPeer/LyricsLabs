import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { updateStreak, getUserStats } from '@/lib/db'
import type { UserStats } from '@/types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  stats: UserStats | null
  refreshStats: () => Promise<void>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<UserStats | null>(null)

  const refreshStats = useCallback(async () => {
    if (!user) return
    const s = await getUserStats(user.id)
    setStats(s)
  }, [user])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setStats(null)
        return
      }
      const newUser = session?.user ?? null
      if (!newUser) return

      // Return the existing object when the user ID hasn't changed so React
      // sees no state difference and skips re-renders (prevents double song load
      // caused by TOKEN_REFRESHED firing with a new User object but same id)
      setUser(prev => (prev?.id === newUser.id ? prev : newUser))

      // Only update streak on actual sign-in, not on token refreshes
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        updateStreak(newUser.id)
          .then(setStats)
          .catch(() => getUserStats(newUser.id).then(setStats))
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, stats, refreshStats, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
