const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined
const BASE = 'https://www.googleapis.com/youtube/v3'

export interface YTChannel {
  id: string
  name: string
  thumbnail: string
  description: string
}

export interface YTVideo {
  videoId: string
  title: string
  channelTitle: string
  thumbnail: string
}

function key() {
  if (!API_KEY) throw new Error('VITE_YOUTUBE_API_KEY is not set in .env.local')
  return API_KEY
}

export async function searchChannels(bandName: string): Promise<YTChannel[]> {
  const params = new URLSearchParams({
    q: bandName,
    type: 'channel',
    part: 'snippet',
    maxResults: '5',
    key: key(),
  })
  const res = await fetch(`${BASE}/search?${params}`)
  if (!res.ok) throw new Error(`YouTube search failed: ${res.status}`)
  const data = await res.json() as {
    items?: Array<{
      id: { channelId: string }
      snippet: { channelTitle: string; description: string; thumbnails: { default?: { url: string } } }
    }>
  }
  return (data.items ?? []).map(item => ({
    id: item.id.channelId,
    name: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails.default?.url ?? '',
    description: item.snippet.description,
  }))
}

export async function getUploadsPlaylistId(channelId: string): Promise<string | null> {
  const params = new URLSearchParams({
    id: channelId,
    part: 'contentDetails',
    key: key(),
  })
  const res = await fetch(`${BASE}/channels?${params}`)
  if (!res.ok) throw new Error(`YouTube channels failed: ${res.status}`)
  const data = await res.json() as {
    items?: Array<{ contentDetails: { relatedPlaylists: { uploads: string } } }>
  }
  return data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? null
}

export async function getPlaylistVideos(
  playlistId: string,
  maxResults = 50,
): Promise<YTVideo[]> {
  const videos: YTVideo[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      playlistId,
      part: 'snippet',
      maxResults: String(Math.min(maxResults - videos.length, 50)),
      key: key(),
    })
    if (pageToken) params.set('pageToken', pageToken)

    const res = await fetch(`${BASE}/playlistItems?${params}`)
    if (!res.ok) throw new Error(`YouTube playlistItems failed: ${res.status}`)
    const data = await res.json() as {
      nextPageToken?: string
      items?: Array<{
        snippet: {
          resourceId: { videoId: string }
          title: string
          channelTitle: string
          thumbnails: { default?: { url: string } }
          videoOwnerChannelTitle?: string
        }
      }>
    }

    for (const item of data.items ?? []) {
      const videoId = item.snippet.resourceId.videoId
      if (!videoId || videoId === 'undefined') continue
      videos.push({
        videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.videoOwnerChannelTitle ?? item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.default?.url ?? '',
      })
    }

    pageToken = videos.length < maxResults ? data.nextPageToken : undefined
  } while (pageToken)

  return videos
}
