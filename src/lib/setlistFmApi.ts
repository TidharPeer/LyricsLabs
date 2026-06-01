const BASE_URL = 'https://api.setlist.fm/rest/1.0'

function apiHeaders(): HeadersInit {
  const key = import.meta.env.VITE_SETLISTFM_API_KEY
  if (!key) throw new Error('VITE_SETLISTFM_API_KEY is not configured')
  return { 'x-api-key': key, 'Accept': 'application/json' }
}

export interface SetlistArtist {
  mbid: string
  name: string
  disambiguation?: string
}

export interface SetlistSong {
  name: string
  cover?: { mbid: string; name: string }
  info?: string
}

export interface Setlist {
  id: string
  eventDate: string // "DD-MM-YYYY"
  artist: SetlistArtist
  venue: {
    name: string
    city: { name: string; stateCode?: string; country: { code: string; name: string } }
  }
  sets: { set: Array<{ song?: SetlistSong[]; encore?: number; name?: string }> }
  url: string
  tour?: { name: string }
}

export async function searchSetlistArtists(name: string): Promise<SetlistArtist[]> {
  const params = new URLSearchParams({ artistName: name, sort: 'relevance', p: '1' })
  const res = await fetch(`${BASE_URL}/search/artists?${params}`, { headers: apiHeaders() })
  if (!res.ok) throw new Error(`setlist.fm search failed (${res.status})`)
  const data = await res.json()
  return (data.artist ?? []) as SetlistArtist[]
}

export async function getArtistSetlists(mbid: string, limit = 5): Promise<Setlist[]> {
  const res = await fetch(`${BASE_URL}/artist/${mbid}/setlists?p=1`, { headers: apiHeaders() })
  if (!res.ok) throw new Error(`setlist.fm setlists failed (${res.status})`)
  const data = await res.json()
  const all = (data.setlist ?? []) as Setlist[]
  return all.filter(s => extractSetlistSongs(s).length > 0).slice(0, limit)
}

export function extractSetlistSongs(setlist: Setlist): SetlistSong[] {
  return setlist.sets.set.flatMap(s => s.song ?? [])
}

export function formatSetlistDate(dateStr: string): string {
  const [dd, mm, yyyy] = dateStr.split('-')
  try {
    return new Date(`${yyyy}-${mm}-${dd}`).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch {
    return dateStr
  }
}
