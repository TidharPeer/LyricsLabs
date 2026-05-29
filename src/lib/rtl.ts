const RTL_LANGS = new Set(['he', 'ar', 'fa', 'ur'])

export function isRTL(language: string): boolean {
  return RTL_LANGS.has(language)
}

export function lyricsDir(language: string): 'rtl' | 'ltr' {
  return isRTL(language) ? 'rtl' : 'ltr'
}
