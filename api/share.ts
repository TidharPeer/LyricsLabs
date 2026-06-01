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

  if (!id) {
    return Response.redirect(origin, 302)
  }

  const playerUrl = `${origin}/playlists/${id}/play`

  let playlistName = 'A Playlist'
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
    const res = await fetch(
      `${supabaseUrl}/rest/v1/playlists?id=eq.${encodeURIComponent(id)}&select=name`,
      {
        headers: {
          apikey: supabaseKey!,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    )
    const data: { name: string }[] = await res.json()
    if (Array.isArray(data) && data[0]?.name) {
      playlistName = data[0].name
    }
  } catch {}

  const title = escapeHtml(`${playlistName} — LyricsLabs`)
  const description = escapeHtml(
    `"${playlistName}" was shared with you on LyricsLabs. Open it to sing along and practice the lyrics!`
  )
  const safePlayerUrl = escapeHtml(playerUrl)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(url.toString())}" />
  <meta property="og:site_name" content="LyricsLabs" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta http-equiv="refresh" content="0;url=${safePlayerUrl}" />
</head>
<body>
  <script>window.location.replace(${JSON.stringify(playerUrl)})</script>
  <p>Opening <a href="${safePlayerUrl}">${title}</a>…</p>
</body>
</html>`

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
  })
}
