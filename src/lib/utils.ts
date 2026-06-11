import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Derives a new playlist name from an existing name and a new concert date.
 * Handles two patterns:
 *   "Artist at Venue (Date)" → "Artist (New Date)"  (setlist import, first rename)
 *   "Artist (Old Date)"      → "Artist (New Date)"  (subsequent renames)
 * Returns null when the name doesn't match either pattern (custom names are left alone).
 */
export function derivePlaylistNameFromDate(currentName: string, formattedDate: string): string | null {
  // Pattern 1: "Artist at Venue (date)" or truncated "Artist at"
  // Match everything before the first " at " or " at" at end of string
  const atMatch = currentName.match(/^(.+?)\s+at(?:\s|$)/)
  if (atMatch) {
    const artist = atMatch[1].trim()
    if (artist) return `${artist} (${formattedDate})`
  }
  // Pattern 2: already renamed — "Artist (old date)" → "Artist (new date)"
  const parenMatch = currentName.match(/^(.+?)\s*\([^)]*\)$/)
  if (parenMatch) {
    return `${parenMatch[1].trim()} (${formattedDate})`
  }
  return null
}

export function toArtistSlug(name: string): string {
  return name
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '') // keep Unicode letters, digits, spaces, hyphens
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}
