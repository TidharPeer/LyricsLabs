import { memo } from 'react'
import { Routes, Route } from 'react-router-dom'
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
import { PrivacyPage } from '@/pages/PrivacyPage'
import { TermsPage } from '@/pages/TermsPage'
import { SetlistImportPage } from '@/pages/SetlistImportPage'
import { ArtistPage } from '@/pages/ArtistPage'
import { LeaderboardPage } from '@/pages/LeaderboardPage'
import { ConcertsPage } from '@/pages/ConcertsPage'

export const AppRoutes = memo(function AppRoutes() {
  return (
    <Routes>
      {/* Auth pages — full-screen, no layout */}
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      {/* All other pages — Layout renders Outlet */}
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
        <Route path="/artists/:slug" element={<ArtistPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/concerts" element={<ConcertsPage />} />
        <Route path="/concerts/past" element={<ConcertsPage past />} />
        <Route path="/import-concert" element={<SetlistImportPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
      </Route>
    </Routes>
  )
})
