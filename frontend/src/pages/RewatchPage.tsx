import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import VideoPlayer from '../components/VideoPlayer'
import TranscriptPanel from '../components/TranscriptPanel'
import GapReview from '../components/GapReview'

type Segment = {
  text: string
  start_ms: number
  end_ms: number
}

type WeakPoint = {
  id: number
  text: string
  wp_type: string
  timestamp_ms: number
  sentence: string
  grasped: boolean
}

type InteractionGroup = {
  segments: Segment[]
  startMs: number
  endMs: number
}

type PlayerEvent = {
  type: 'pause' | 'play' | 'seek'
  timestamp: number
  previousTimestamp?: number
}

function RewatchPage() {
  const { videoId } = useParams<{ videoId: string }>()
  const [segments, setSegments] = useState<Segment[]>([])
  const [weakPoints, setWeakPoints] = useState<WeakPoint[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [showGapReview, setShowGapReview] = useState(false)
  const [gapGroups, setGapGroups] = useState<InteractionGroup[]>([])
  const [summary, setSummary] = useState<any>(null)
  const eventsRef = useRef<PlayerEvent[]>([])
  const matchedRef = useRef<Set<number>>(new Set())
  const passedRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (!videoId) return

    // Load transcript
    fetch(`/api/transcripts/${videoId}`)
      .then((r) => r.json())
      .then((data) => setSegments(data.segments || []))
      .catch(() => {})

    // Load weak points for this video
    fetch(`/api/weak-points?search=&type=`)
      .then((r) => r.json())
      .then((data) => {
        const wps = (data.weak_points || []).filter(
          (wp: any) => wp.video_id === videoId && !wp.grasped
        )
        setWeakPoints(wps)
      })

    // Start rewatch session
    fetch('/api/rewatch/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_id: videoId }),
    })
      .then((r) => r.json())
      .then((data) => setSessionId(data.session_id))
  }, [videoId])

  const handlePlayerEvent = useCallback(
    (event: PlayerEvent) => {
      eventsRef.current.push(event)

      // Check proximity to weak points (3s threshold)
      for (const wp of weakPoints) {
        const dist = Math.abs(event.timestamp - wp.timestamp_ms)
        if (dist <= 3000) {
          matchedRef.current.add(wp.id)
        }
      }
    },
    [weakPoints]
  )

  const handleWatchComplete = () => {
    // Determine passed (not matched)
    for (const wp of weakPoints) {
      if (!matchedRef.current.has(wp.id)) {
        passedRef.current.add(wp.id)
      }
    }

    const groups = computeGapGroups(eventsRef.current, segments)
    setGapGroups(groups)

    const passedCount = passedRef.current.size
    const struggledCount = matchedRef.current.size

    setSummary({
      passed_count: passedCount,
      struggled_count: struggledCount,
      new_weak_points_count: groups.length,
    })
    setShowSummary(true)

    if (groups.length > 0) {
      setShowGapReview(true)
    }
  }

  const handleMarkGrasped = async () => {
    for (const id of passedRef.current) {
      await fetch(`/api/weak-points/${id}/grasp`, {
        method: 'POST',
      })
    }
  }

  const markers = weakPoints.map((wp) => wp.timestamp_ms)

  return (
    <div className="rewatch-page">
      <h2>Re-watch</h2>

      {videoId && (
        <div className="player-layout">
          <div className="player-side">
            <VideoPlayer
              videoId={videoId}
              onTimeUpdate={setCurrentTime}
              onPlayerEvent={handlePlayerEvent}
              markers={markers}
            />
            <button className="done-watching" onClick={handleWatchComplete}>
              Done Re-watching
            </button>
          </div>
          <TranscriptPanel
            segments={segments}
            currentTime={currentTime}
          />
        </div>
      )}

      {showSummary && summary && (
        <div className="rewatch-summary">
          <h3>Re-watch Summary</h3>
          <div className="stats">
            <div className="stat passed">
              <span className="count">{summary.passed_count}</span>
              <span className="label">Passed (Grasped!)</span>
            </div>
            <div className="stat struggled">
              <span className="count">{summary.struggled_count}</span>
              <span className="label">Still Struggling</span>
            </div>
            <div className="stat new">
              <span className="count">{summary.new_weak_points_count}</span>
              <span className="label">New Gaps</span>
            </div>
          </div>
          {summary.passed_count > 0 && (
            <button onClick={handleMarkGrasped}>
              Mark {summary.passed_count} as Grasped
            </button>
          )}
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
    const clusterCenter = cluster.reduce((s, e) => s + e.timestamp, 0) / cluster.length
    const nearby = segments.filter(
      (s) => s.end_ms >= clusterCenter - 15000 && s.start_ms <= clusterCenter + 5000
    )
    if (nearby.length > 0) {
      groups.push({
        segments: nearby,
        startMs: nearby[0].start_ms,
        endMs: nearby[nearby.length - 1].end_ms,
      })
    }
  }
  return groups
}

export default RewatchPage
