export const config = { runtime: 'edge' }

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  const origin = url.origin

  if (!id) return Response.redirect(origin, 302)

  const songUrl = `${origin}/songs/${id}`

  let title = 'A Song'
  let artist = ''
  let youtubeId = ''

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
    const res = await fetch(
      `${supabaseUrl}/rest/v1/songs?id=eq.${encodeURIComponent(id)}&select=title,artist,youtube_id`,
      {
        headers: {
          apikey: supabaseKey!,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    )
    const data: { title: string; artist: string; youtube_id: string }[] = await res.json()
    if (Array.isArray(data) && data[0]) {
      title = data[0].title || title
      artist = data[0].artist || ''
      youtubeId = data[0].youtube_id || ''
    }
  } catch {}

  const ogTitle = escapeHtml(
    artist ? `${title} · ${artist} — LyricsLabs` : `${title} — LyricsLabs`
  )
  const ogDescription = escapeHtml(
    artist
      ? `Learn to sing "${title}" by ${artist} on LyricsLabs — interactive karaoke, synced lyrics, and practice games to help you memorize every word.`
      : `Learn to sing "${title}" on LyricsLabs — interactive karaoke, synced lyrics, and practice games.`
  )
  const safeSongUrl = escapeHtml(songUrl)
  const ogImage = youtubeId
    ? escapeHtml(`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`)
    : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${ogTitle}</title>
  <meta property="og:type" content="music.song" />
  <meta property="og:url" content="${safeSongUrl}" />
  <meta property="og:site_name" content="LyricsLabs" />
  <meta property="og:title" content="${ogTitle}" />
  <meta property="og:description" content="${ogDescription}" />
  ${ogImage ? `<meta property="og:image" content="${ogImage}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${ogImage}" />` : '<meta name="twitter:card" content="summary" />'}
  <meta name="twitter:title" content="${ogTitle}" />
  <meta name="twitter:description" content="${ogDescription}" />
  <meta http-equiv="refresh" content="0;url=${safeSongUrl}" />
</head>
<body>
  <script>window.location.replace(${JSON.stringify(songUrl)})</script>
  <p>Opening <a href="${safeSongUrl}">${ogTitle}</a>…</p>
</body>
</html>`

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
  })
}
