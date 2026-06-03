import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { User, LogOut, Star, Flame, Sun, Moon, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'

function ContactDialog({ open, onOpenChange, userEmail }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  userEmail?: string
}) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSend() {
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message, fromEmail: userEmail }),
      })
      if (!res.ok) throw new Error()
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  function handleClose() {
    onOpenChange(false)
    setTimeout(() => { setSubject(''); setMessage(''); setStatus('idle') }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Contact Us</DialogTitle>
        </DialogHeader>

        {status === 'sent' ? (
          <div className="py-6 text-center space-y-2">
            <p className="text-lg font-semibold">Message sent!</p>
            <p className="text-sm text-muted-foreground">We'll get back to you at {userEmail ?? 'your email'}.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="contact-subject">Subject</Label>
              <Input
                id="contact-subject"
                placeholder="What is this about?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={status === 'sending'}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea
                id="contact-message"
                placeholder="Write your message here..."
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={status === 'sending'}
              />
            </div>
            {status === 'error' && (
              <p className="text-sm text-destructive">Something went wrong — please try again.</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {status === 'sent' ? 'Close' : 'Cancel'}
          </Button>
          {status !== 'sent' && (
            <Button
              onClick={handleSend}
              disabled={!subject.trim() || !message.trim() || status === 'sending'}
            >
              {status === 'sending' ? 'Sending…' : 'Send'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function UserMenu() {
  const { t } = useTranslation()
  const { user, signOut, stats } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)

  if (!user) {
    return (
      <Button size="sm" asChild>
        <Link to="/auth">{t('auth.signIn')}</Link>
      </Button>
    )
  }

  const initials = (user.email ?? 'U').slice(0, 2).toUpperCase()

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-muted transition-colors"
      >
        {stats !== null && (
          <span className="flex items-center gap-0.5 text-xs font-medium text-amber-500">
            <Star className="h-3.5 w-3.5 fill-amber-500" />
            {stats.stars}
          </span>
        )}
        {stats !== null && stats.streakCurrent > 0 && (
          <span className="flex items-center gap-0.5 text-xs font-medium text-orange-500">
            <Flame className="h-3.5 w-3.5 fill-orange-400" />
            {stats.streakCurrent}
          </span>
        )}
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
          {initials}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-40 w-48 rounded-lg border bg-popover shadow-md py-1">
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left"
              onClick={() => { navigate('/'); setOpen(false) }}
            >
              <User className="h-4 w-4" />
              {t('auth.mySongs')}
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left"
              onClick={() => { navigate('/profile'); setOpen(false) }}
            >
              <Star className="h-4 w-4" />
              {t('auth.profile')}
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left"
              onClick={toggleTheme}
            >
              {theme === 'dark'
                ? <Sun className="h-4 w-4" />
                : <Moon className="h-4 w-4" />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left"
              onClick={() => { setContactOpen(true); setOpen(false) }}
            >
              <Mail className="h-4 w-4" />
              Contact
            </button>
            <div className="border-t my-1" />
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left text-muted-foreground"
              onClick={() => { signOut(); setOpen(false) }}
            >
              <LogOut className="h-4 w-4" />
              {t('auth.signOut')}
            </button>
          </div>
        </>
      )}

      <ContactDialog open={contactOpen} onOpenChange={setContactOpen} userEmail={user.email ?? undefined} />
    </div>
  )
}
