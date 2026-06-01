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

async function proxyGet(path: string, params: Record<string, string> = {}): Promise<Response> {
  const qs = new URLSearchParams({ path, ...params })
  return fetch(`/api/setlistfm?${qs}`)
}

export async function searchSetlistArtists(name: string): Promise<SetlistArtist[]> {
  const res = await proxyGet('/search/artists', { artistName: name, sort: 'relevance', p: '1' })
  if (!res.ok) throw new Error(`setlist.fm search failed (${res.status})`)
  const data = await res.json()
  return (data.artist ?? []) as SetlistArtist[]
}

export async function getArtistSetlists(mbid: string, limit = 5): Promise<Setlist[]> {
  const res = await proxyGet(`/artist/${mbid}/setlists`, { p: '1' })
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
