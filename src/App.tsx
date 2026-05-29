import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { HomePage } from '@/pages/HomePage'
import { SongFormPage } from '@/pages/SongFormPage'
import { SongDetailPage } from '@/pages/SongDetailPage'
import { TimestampPage } from '@/pages/TimestampPage'
import { GamePage } from '@/pages/GamePage'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/songs/new" element={<SongFormPage />} />
          <Route path="/songs/:id" element={<SongDetailPage />} />
          <Route path="/songs/:id/edit" element={<SongFormPage />} />
          <Route path="/songs/:id/timestamps" element={<TimestampPage />} />
          <Route path="/songs/:id/game/:mode" element={<GamePage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
