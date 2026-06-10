import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
