import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { updateStreak, getUserStats } from '@/lib/db'
import type { UserStats } from '@/types'

interface AuthUserContextValue {
  user: User | null
  stats: UserStats | null
  refreshStats: () => Promise<void>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

// Stable context — only changes when user/stats change, not when loading changes.
// Layout subscribes here so it doesn't re-render (and force an Outlet remount) on loading transitions.
const AuthUserContext = createContext<AuthUserContextValue | null>(null)

// Volatile context — changes when the initial session check resolves.
const AuthLoadingContext = createContext<boolean>(true)

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
      console.log('[Auth] getSession resolved, user:', data.session?.user?.id ?? 'null')
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] onAuthStateChange:', event, 'userId:', session?.user?.id ?? 'null')
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setStats(null)
        return
      }
      const newUser = session?.user ?? null
      if (!newUser) return

      setUser(prev => {
        const same = prev?.id === newUser.id
        console.log('[Auth] setUser — prev:', prev?.id ?? 'null', '→', newUser.id, same ? '(same)' : '(updating)')
        return same ? prev : newUser
      })

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        updateStreak(newUser.id)
          .then(setStats)
          .catch(() => getUserStats(newUser.id).then(setStats))
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  // Memoized so the stable context value only changes when user/stats actually change,
  // not when loading changes. This prevents Layout (which reads from this context)
  // from re-rendering during the loading→loaded transition.
  const userValue = useMemo<AuthUserContextValue>(() => ({
    user, stats, refreshStats, signUp, signIn, signInWithGoogle, signOut,
  }), [user, stats, refreshStats, signUp, signIn, signInWithGoogle, signOut])

  return (
    <AuthUserContext.Provider value={userValue}>
      <AuthLoadingContext.Provider value={loading}>
        {children}
      </AuthLoadingContext.Provider>
    </AuthUserContext.Provider>
  )
}

/** Full auth hook — re-renders on user AND loading changes. Use in most components. */
export function useAuth() {
  const ctx = useContext(AuthUserContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  const loading = useContext(AuthLoadingContext)
  return { ...ctx, loading }
}

/** Stable auth hook — only re-renders when user/stats change, not on loading transitions.
 *  Use in layout/shell components that must not re-render during the initial auth check. */
export function useAuthUser() {
  const ctx = useContext(AuthUserContext)
  if (!ctx) throw new Error('useAuthUser must be used inside AuthProvider')
  return ctx
}
