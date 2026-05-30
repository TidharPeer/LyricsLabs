import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { PlaylistsView } from '@/components/songs/PlaylistsView'

export function PlaylistsPage() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/auth" replace />
  return <PlaylistsView userId={user.id} />
}
