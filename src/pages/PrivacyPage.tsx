import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto py-10 space-y-8">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mt-1">Last updated: June 2026</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Overview</h2>
        <p className="text-muted-foreground leading-relaxed">
          LyricsLab is a personal, non-commercial project for learning song lyrics. This policy explains what
          information we collect and how we use it. We do not sell or share your data with third parties for
          advertising or any commercial purpose.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Information We Collect</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex gap-2">
            <span className="shrink-0 mt-1">•</span>
            <span><strong className="text-foreground">Account information</strong> — your email address and name, provided when you sign in with Google.</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 mt-1">•</span>
            <span><strong className="text-foreground">Content you create</strong> — songs, lyrics, and playlists you add to the app.</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 mt-1">•</span>
            <span><strong className="text-foreground">Usage data</strong> — your practice streaks, game scores, and stars earned within the app.</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 mt-1">•</span>
            <span><strong className="text-foreground">Preferences</strong> — settings such as your chosen display theme, stored locally in your browser.</span>
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">How We Use Your Information</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex gap-2"><span className="shrink-0 mt-1">•</span><span>To authenticate you and maintain your account.</span></li>
          <li className="flex gap-2"><span className="shrink-0 mt-1">•</span><span>To store and display your songs, playlists, and progress.</span></li>
          <li className="flex gap-2"><span className="shrink-0 mt-1">•</span><span>To track streaks and scores so you can see your improvement over time.</span></li>
        </ul>
        <p className="text-muted-foreground leading-relaxed">
          We do not use your data for advertising, analytics sold to third parties, or any purpose beyond
          operating the app for you.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Third-Party Services</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex gap-2">
            <span className="shrink-0 mt-1">•</span>
            <span><strong className="text-foreground">Google Sign-In</strong> — used for authentication. Governed by <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Google's Privacy Policy</a>.</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 mt-1">•</span>
            <span><strong className="text-foreground">Supabase</strong> — our database and authentication infrastructure. Data is stored in Supabase's cloud. See <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Supabase's Privacy Policy</a>.</span>
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Data Retention & Deletion</h2>
        <p className="text-muted-foreground leading-relaxed">
          Your data is kept for as long as your account is active. To request deletion of your account and all
          associated data, contact us at the email below and we will remove it within 30 days.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Cookies & Local Storage</h2>
        <p className="text-muted-foreground leading-relaxed">
          We use browser local storage to keep you signed in and remember your preferences (e.g. dark/light
          mode). No third-party tracking cookies are used.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Contact</h2>
        <p className="text-muted-foreground leading-relaxed">
          Questions about this policy or requests to delete your data can be sent to{' '}
          <a href="mailto:tidhar.peer@gmail.com" className="underline hover:text-foreground">
            tidhar.peer@gmail.com
          </a>.
        </p>
      </section>
    </div>
  )
}
