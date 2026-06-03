export const config = { runtime: 'edge' }

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { subject, message, fromEmail, fromName } = await request.json()

  if (!subject?.trim() || !message?.trim()) {
    return new Response(JSON.stringify({ error: 'Subject and message are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Email service not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const senderLabel = fromName || fromEmail || 'LyricsLabs User'
  const body = fromEmail
    ? `From: ${senderLabel} (${fromEmail})\n\n${message}`
    : message

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'LyricsLabs <no-reply@lyricslabs.com>',
      to: ['support@lyricslabs.com'],
      ...(fromEmail ? { reply_to: fromEmail } : {}),
      subject: `[LyricsLabs Contact] ${subject}`,
      text: body,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return new Response(JSON.stringify({ error: err }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
