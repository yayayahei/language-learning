import { useState, useCallback, useRef, useEffect } from 'react'
import VideoPlayer from '../components/VideoPlayer'
import TranscriptPanel from '../components/TranscriptPanel'
import GapReview from '../components/GapReview'

type Segment = {
  text: string
  start_ms: number
  end_ms: number
}

type PlayerEvent = {
  type: 'pause' | 'play' | 'seek'
  timestamp: number
  previousTimestamp?: number
}

type InteractionGroup = {
  segments: Segment[]
  startMs: number
  endMs: number
}

const API = '/api'

async function fetchTranscript(url: string): Promise<{
  video_id: string
  language: string
  segments: Segment[]
}> {
  const res = await fetch(`${API}/transcripts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to fetch transcript')
  }
  return res.json()
}

function extractVideoId(url: string): string | null {
  const m = url.match(/(?:v=|\/v\/|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

function VideoPage() {
  const [url, setUrl] = useState('')
  const [videoId, setVideoId] = useState<string | null>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showGapReview, setShowGapReview] = useState(false)
  const [gapGroups, setGapGroups] = useState<InteractionGroup[]>([])
  const [initialPosition, setInitialPosition] = useState(0)

  const seekRef = useRef<((ms: number) => void) | null>(null)
  const eventsRef = useRef<PlayerEvent[]>([])
  const lastSavedRef = useRef(0)

  const handleLoad = async () => {
    if (!url.trim()) return
    setError('')
    setLoading(true)
    try {
      const data = await fetchTranscript(url)
      const vid = extractVideoId(url)
      setVideoId(vid)
      setSegments(data.segments)
      eventsRef.current = []
      setShowGapReview(false)

      // Fetch saved playback position
      if (vid) {
        try {
          const posRes = await fetch(`/api/videos/${vid}/position`)
          const posData = await posRes.json()
          setInitialPosition(posData.position_ms || 0)
          lastSavedRef.current = posData.position_ms || 0
        } catch {}
      }
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  const handlePlayerEvent = useCallback((event: PlayerEvent) => {
    eventsRef.current.push(event)
  }, [])

  const lastTimeRef = useRef(0)

  const handleTimeUpdate = (time: number) => {
    lastTimeRef.current = time
    setCurrentTime(time)
  }

  // Save playback position every 5 seconds
  useEffect(() => {
    if (!videoId) return
    const interval = setInterval(() => {
      const t = lastTimeRef.current
      if (t > 0 && Math.abs(t - lastSavedRef.current) > 5000) {
        lastSavedRef.current = t
        fetch(`/api/videos/${videoId}/position`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position_ms: Math.round(t) }),
        }).catch(() => {})
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [videoId])

  const handleSeek = useCallback((timeMs: number) => {
    seekRef.current?.(timeMs)
  }, [])

  const handleWatchComplete = () => {
    const groups = computeGapGroups(eventsRef.current, segments)
    setGapGroups(groups)
    if (groups.length > 0) {
      setShowGapReview(true)
    }
  }

  return (
    <div className="video-page">
      <div className="url-input-row">
        <input
          type="text"
          placeholder="Paste YouTube URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
        />
        <button onClick={handleLoad} disabled={loading}>
          {loading ? 'Loading...' : 'Load'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {videoId && (
        <div className="player-layout">
          <div className="player-side">
            <VideoPlayer
              videoId={videoId}
              onTimeUpdate={handleTimeUpdate}
              onPlayerEvent={handlePlayerEvent}
              seekRef={seekRef}
              initialPositionMs={initialPosition}
            />
            <button className="done-watching" onClick={handleWatchComplete}>
              Done Watching
            </button>
          </div>
          <TranscriptPanel
            segments={segments}
            currentTime={currentTime}
            onSeek={handleSeek}
          />
        </div>
      )}

      {showGapReview && (
        <GapReview
          groups={gapGroups}
          videoId={videoId!}
          onClose={() => setShowGapReview(false)}
        />
      )}
    </div>
  )
}

function computeGapGroups(events: PlayerEvent[], segments: Segment[]): InteractionGroup[] {
  if (!events.length || !segments.length) return []

  // Find event timestamps near each other (within 10s window)
  const WINDOW_MS = 10000
  const clusters: PlayerEvent[][] = []
  let currentCluster: PlayerEvent[] = [events[0]]

  for (let i = 1; i < events.length; i++) {
    if (events[i].timestamp - currentCluster[0].timestamp < WINDOW_MS) {
      currentCluster.push(events[i])
    } else {
      clusters.push(currentCluster)
      currentCluster = [events[i]]
    }
  }
  clusters.push(currentCluster)

  const groups: InteractionGroup[] = []
  for (const cluster of clusters) {
    // Find segments around the cluster (2 before, 1 after the event)
    const clusterCenter = cluster.reduce((s, e) => s + e.timestamp, 0) / cluster.length
    const nearbySegments = segments.filter(
      (s) =>
        s.end_ms >= clusterCenter - 8000 &&
        s.start_ms <= clusterCenter + 4000
    ).slice(0, 4)
    if (nearbySegments.length > 0) {
      groups.push({
        segments: nearbySegments,
        startMs: nearbySegments[0].start_ms,
        endMs: nearbySegments[nearbySegments.length - 1].end_ms,
      })
    }
  }

  return groups
}

export default VideoPage
