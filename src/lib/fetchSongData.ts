import type { LyricLine } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FetchedMetadata {
  title: string
  artist: string
  language: string
}

export interface FetchedLyrics {
  lines: LyricLine[]
  synced: boolean // true = timestamps already set from LRC
}

// ─── Language detection ───────────────────────────────────────────────────────

function detectLanguage(text: string): string {
  if (/[֐-׿יִ-ﭏ]/.test(text)) return 'he'  // Hebrew
  if (/[؀-ۿݐ-ݿ]/.test(text)) return 'ar'  // Arabic
  if (/[Ѐ-ӿ]/.test(text)) return 'ru'               // Cyrillic
  if (/[぀-ヿ]/.test(text)) return 'ja'               // Japanese
  if (/[가-힯]/.test(text)) return 'ko'               // Korean
  if (/[一-鿿]/.test(text)) return 'zh'               // Chinese
  return 'en'
}

// ─── Title cleanup ────────────────────────────────────────────────────────────

const JUNK_RE = [
  /\s*[\(\[][^\)\]]*(?:official|audio|video|lyric(?:s)?|hd|4k|remaster(?:ed)?|mv|clip|visualizer|live|vevo|explicit|clean|version|ver\.|edit|ft\.|feat\.[^\)\]]*)[\)\]]/gi,
  /\s*\|\s*(?:official|audio|video|music\s*video).*$/gi,
  /\s+-\s+(?:official|audio|video|music)(?:\s*video|\s*audio)?$/gi,
]

function cleanTitle(raw: string): string {
  let s = raw
  for (const re of JUNK_RE) s = s.replace(re, '')
  return s.trim()
}

// ─── YouTube oEmbed ───────────────────────────────────────────────────────────

export async function fetchYouTubeMetadata(videoId: string): Promise<FetchedMetadata | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    )
    if (!res.ok) return null
    const data = await res.json() as { title?: string; author_name?: string }

    const rawTitle = data.title ?? ''
    const channel = (data.author_name ?? '').replace(/vevo|official|music|channel/gi, '').trim()

    // Many YouTube titles follow "Artist - Song Title (extra)" format
    const dashIdx = rawTitle.indexOf(' - ')
    let artist: string
    let title: string

    if (dashIdx > 0) {
      artist = rawTitle.slice(0, dashIdx).trim()
      title = cleanTitle(rawTitle.slice(dashIdx + 3))
    } else {
      // No dash — use channel name as artist, clean the full title
      artist = channel
      title = cleanTitle(rawTitle)
    }

    const language = detectLanguage(rawTitle + ' ' + artist)
    return { title, artist, language }
  } catch {
    return null
  }
}

// ─── LRC parsing ─────────────────────────────────────────────────────────────

function parseLRC(lrc: string): LyricLine[] {
  return lrc
    .split('\n')
    .map((line): LyricLine | null => {
      // [MM:SS.mm] or [MM:SS.mmm]
      const m = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.+)$/)
      if (!m) return null
      const msLen = m[3].length
      const timestamp =
        parseInt(m[1]) * 60 +
        parseInt(m[2]) +
        parseInt(m[3]) / (msLen === 3 ? 1000 : 100)
      return {
        id: crypto.randomUUID(),
        text: m[4].trim(),
        timestamp: Math.round(timestamp * 10) / 10,
      }
    })
    .filter((l): l is LyricLine => l !== null && l.text.length > 0)
}

function parsePlain(plain: string): LyricLine[] {
  return plain
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((text) => ({ id: crypto.randomUUID(), text }))
}

// ─── Lyrics fetch (lrclib → lyrics.ovh fallback) ─────────────────────────────

export async function fetchLyrics(artist: string, title: string): Promise<FetchedLyrics | null> {
  // 1. lrclib.net — free, open-source, has synced LRC
  try {
    const params = new URLSearchParams({ artist_name: artist, track_name: title })
    const res = await fetch(`https://lrclib.net/api/get?${params}`, {
      headers: { 'Lrclib-Client': 'LyricLab/1.0' },
    })
    if (res.ok) {
      const data = await res.json() as { syncedLyrics?: string; plainLyrics?: string }
      if (data.syncedLyrics) {
        const lines = parseLRC(data.syncedLyrics)
        if (lines.length > 0) return { lines, synced: true }
      }
      if (data.plainLyrics) {
        const lines = parsePlain(data.plainLyrics)
        if (lines.length > 0) return { lines, synced: false }
      }
    }
  } catch { /* ignore */ }

  // 2. lyrics.ovh — simple free fallback
  try {
    const res = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
    )
    if (res.ok) {
      const data = await res.json() as { lyrics?: string }
      if (data.lyrics) {
        const lines = parsePlain(data.lyrics)
        if (lines.length > 0) return { lines, synced: false }
      }
    }
  } catch { /* ignore */ }

  return null
}
