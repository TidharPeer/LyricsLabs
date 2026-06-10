import styled, { css, keyframes } from 'styled-components'

export const lyricPulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`

export const ActiveLyricLine = styled.div`
  animation: ${lyricPulse} 1.5s ease-in-out infinite;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  border-inline-start: 3px solid var(--primary);
  border-radius: 0.25rem;
  padding: 0.5rem 0.75rem;
  transition: all 0.2s ease;
`

export const InactiveLyricLine = styled.div`
  font-size: 1rem;
  color: var(--muted-foreground);
  padding: 0.4rem 0.75rem;
  transition: all 0.2s ease;
  border-inline-start: 3px solid transparent;
  border-radius: 0.25rem;
`

/* Compact variant — same pulse but smaller font, for game views */
export const activeLineMixin = css`
  animation: ${lyricPulse} 1.5s ease-in-out infinite;
  font-weight: 600;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  border-inline-start: 3px solid var(--primary) !important;
  border-radius: 0.25rem;
  opacity: 1 !important;
`

export const inactiveLineMixin = css`
  border-inline-start: 3px solid transparent;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
`
