import { useEffect, useRef, useCallback } from 'react'

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void
    YT: any
  }
}

type PlayerEvent = {
  type: 'pause' | 'play' | 'seek'
  timestamp: number
  previousTimestamp?: number
}

type Props = {
  videoId: string
  onTimeUpdate?: (time: number) => void
  onPlayerEvent?: (event: PlayerEvent) => void
  markers?: number[]
  seekRef?: React.MutableRefObject<((ms: number) => void) | null>
  initialPositionMs?: number
}

function VideoPlayer({ videoId, onTimeUpdate, onPlayerEvent, seekRef, initialPositionMs }: Props) {
  const playerRef = useRef<any>(null)
  const intervalRef = useRef<number>(0)
  const lastTimeRef = useRef(0)
  const lastStateRef = useRef(-1)

  const onReady = useCallback((event: any) => {
    const player = event.target
    // Expose seek function to parent
    if (seekRef) {
      seekRef.current = (ms: number) => {
        player.seekTo(ms / 1000, true)
      }
    }
    // Resume from saved position
    if (initialPositionMs && initialPositionMs > 0) {
      player.seekTo(initialPositionMs / 1000, true)
    }
    player.playVideo()
  }, [seekRef, initialPositionMs])

  const onStateChange = useCallback((event: any) => {
    const player = event.target
    const currentTime = player.getCurrentTime() * 1000

    if (event.data === 2 && lastStateRef.current === 1) {
      onPlayerEvent?.({ type: 'pause', timestamp: currentTime })
    }
    if (event.data === 1) {
      onPlayerEvent?.({ type: 'play', timestamp: currentTime })
    }

    lastStateRef.current = event.data
  }, [onPlayerEvent])

  useEffect(() => {
    if (!videoId) return

    if (intervalRef.current) clearInterval(intervalRef.current)

    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

      window.onYouTubeIframeAPIReady = () => {
        createPlayer()
      }
    } else {
      createPlayer()
    }

    function createPlayer() {
      if (playerRef.current) {
        playerRef.current.destroy()
      }

      playerRef.current = new window.YT.Player('youtube-player', {
        videoId,
        events: {
          onReady,
          onStateChange,
        },
      })

      intervalRef.current = window.setInterval(() => {
        if (playerRef.current?.getCurrentTime) {
          const time = playerRef.current.getCurrentTime() * 1000
          const prev = lastTimeRef.current

          if (prev > 0 && Math.abs(time - prev) > 500) {
            if (time > prev) {
              onPlayerEvent?.({ type: 'seek', timestamp: time, previousTimestamp: prev })
            }
          }

          lastTimeRef.current = time
          onTimeUpdate?.(time)
        }
      }, 300)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (playerRef.current?.destroy) playerRef.current.destroy()
    }
  }, [videoId])

  return <div id="youtube-player" style={{ width: '100%', aspectRatio: '16/9', minHeight: '50vh', maxHeight: '70vh' }} />
}

export default VideoPlayer
