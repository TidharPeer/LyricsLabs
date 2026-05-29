let ready = false
let queue: Array<() => void> = []

export function loadYTApi(cb: () => void): void {
  if (ready) { cb(); return }
  queue.push(cb)
  if (document.getElementById('yt-iframe-api')) return
  const s = document.createElement('script')
  s.id = 'yt-iframe-api'
  s.src = 'https://www.youtube.com/iframe_api'
  document.head.appendChild(s)
  window.onYouTubeIframeAPIReady = () => {
    ready = true
    queue.forEach((fn) => fn())
    queue = []
  }
}
