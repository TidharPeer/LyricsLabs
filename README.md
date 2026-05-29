# LyricLab

A personal web app for learning song lyrics by heart.

## Features

- **Add songs** — paste a YouTube link and your own lyrics
- **Karaoke view** — lyrics highlight in sync with the video as it plays
- **Live timestamp sync** — tap a button on each beat to stamp lines; undo and rewind if you miss
- **Three practice games**:
  - Fill in the Blank — hidden words, type them back
  - Fade-Out Challenge — lyrics disappear round by round until you recite from memory
  - Line Completion — see the start of each line, finish the rest
- **Background music** — play the song audio while practising any game
- **RTL support** — Hebrew, Arabic, and other right-to-left languages render correctly
- **Multi-language UI** — i18n ready (`src/i18n/en.json`)
- **Offline / no backend** — all data stored in `localStorage`

## Stack

React · Vite · TypeScript · Tailwind CSS · Styled Components · ShadCN · react-i18next

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).
