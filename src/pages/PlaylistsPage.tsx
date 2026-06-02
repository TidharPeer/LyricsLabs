import { Link } from 'react-router-dom'
import { ListMusic } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { PlaylistsView } from '@/components/songs/PlaylistsView'

export function PlaylistsPage() {
  const { user } = useAuth()

  if (!user) return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <ListMusic className="h-12 w-12 text-muted-foreground/40" />
      <h2 className="text-xl font-semibold">Your Playlists</h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        Sign in to create playlists and organise your favourite songs.
      </p>
      <Button asChild><Link to="/auth">Sign In</Link></Button>
    </div>
  )

  return <PlaylistsView userId={user.id} />
}
