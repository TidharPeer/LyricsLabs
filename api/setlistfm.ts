export const config = { runtime: 'edge' }

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const targetPath = url.searchParams.get('path') || '/'
  url.searchParams.delete('path')

  const targetUrl = `https://api.setlist.fm/rest/1.0${targetPath}?${url.searchParams}`

  const response = await fetch(targetUrl, {
    headers: {
      'x-api-key': process.env.VITE_SETLISTFM_API_KEY || '',
      'Accept': 'application/json',
    },
  })

  const text = await response.text()
  return new Response(text, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
