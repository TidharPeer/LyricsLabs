import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function TermsPage() {
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
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mt-1">Last updated: June 2026</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Acceptance of Terms</h2>
        <p className="text-muted-foreground leading-relaxed">
          By accessing or using LyricsLabs ("the app"), you agree to be bound by these Terms of Service.
          If you do not agree, please do not use the app. LyricsLabs is a personal, non-commercial project
          provided free of charge.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Use of the App</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex gap-2"><span className="shrink-0 mt-1">•</span><span>You must be at least 13 years old to use LyricsLabs.</span></li>
          <li className="flex gap-2"><span className="shrink-0 mt-1">•</span><span>You are responsible for maintaining the security of your account.</span></li>
          <li className="flex gap-2"><span className="shrink-0 mt-1">•</span><span>You agree not to use the app for any unlawful purpose or in any way that could harm others.</span></li>
          <li className="flex gap-2"><span className="shrink-0 mt-1">•</span><span>You agree not to attempt to reverse engineer, scrape, or disrupt the app or its infrastructure.</span></li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Intellectual Property</h2>
        <p className="text-muted-foreground leading-relaxed">
          Song lyrics displayed on LyricsLabs are the property of their respective copyright holders.
          LyricsLabs does not claim ownership of any lyrics or music content. The app is intended for
          personal, educational, and entertainment use only. No fees are charged and no commercial use
          of third-party content is made.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">User Content</h2>
        <p className="text-muted-foreground leading-relaxed">
          Content you add to the app (songs, playlists, notes) remains yours. By adding content, you
          grant LyricsLabs a limited license to store and display it to you within the app. You are
          responsible for ensuring you have the right to add any content you submit.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Disclaimer of Warranties</h2>
        <p className="text-muted-foreground leading-relaxed">
          LyricsLabs is provided "as is" without warranties of any kind, express or implied. We do not
          guarantee that the app will be available at all times, error-free, or that any data will be
          preserved indefinitely. Use the app at your own discretion.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Limitation of Liability</h2>
        <p className="text-muted-foreground leading-relaxed">
          To the fullest extent permitted by law, the creator of LyricsLabs shall not be liable for any
          indirect, incidental, or consequential damages arising from your use of the app.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Changes to These Terms</h2>
        <p className="text-muted-foreground leading-relaxed">
          We may update these terms from time to time. Continued use of the app after changes are posted
          constitutes acceptance of the new terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Contact</h2>
        <p className="text-muted-foreground leading-relaxed">
          Questions about these terms can be sent to{' '}
          <a href="mailto:tidhar.peer@gmail.com" className="underline hover:text-foreground">
            tidhar.peer@gmail.com
          </a>.
        </p>
      </section>
    </div>
  )
}
