import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { Layout } from '@/components/layout/Layout'
import { HomePage } from '@/pages/HomePage'
import { AuthPage } from '@/pages/AuthPage'
import { SongFormPage } from '@/pages/SongFormPage'
import { SongDetailPage } from '@/pages/SongDetailPage'
import { TimestampPage } from '@/pages/TimestampPage'
import { GamePage } from '@/pages/GamePage'
import { ProfilePage } from '@/pages/ProfilePage'
import { PlaylistsPage } from '@/pages/PlaylistsPage'
import { PlaylistPlayerPage } from '@/pages/PlaylistPlayerPage'
import { AuthCallbackPage } from '@/pages/AuthCallbackPage'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Auth pages — full-screen, no layout */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* All other pages — Layout renders Outlet, React Router owns the lifecycle */}
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/playlists" element={<PlaylistsPage />} />
            <Route path="/playlists/:id/play" element={<PlaylistPlayerPage />} />
            <Route path="/songs/new" element={<SongFormPage />} />
            <Route path="/songs/:id" element={<SongDetailPage />} />
            <Route path="/songs/:id/edit" element={<SongFormPage />} />
            <Route path="/songs/:id/timestamps" element={<TimestampPage />} />
            <Route path="/songs/:id/game/:mode" element={<GamePage />} />
          </Route>
        </Routes>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
