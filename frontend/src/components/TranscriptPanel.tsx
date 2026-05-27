import { useEffect, useRef, useState } from 'react'

type Segment = {
  text: string
  start_ms: number
  end_ms: number
}

type Props = {
  segments: Segment[]
  currentTime: number
  onSeek?: (timeMs: number) => void
  highlightedRange?: { start: number; end: number }
}

function TranscriptPanel({ segments, currentTime, onSeek, highlightedRange }: Props) {
  const listRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => {
    const idx = segments.findIndex(
      (s) => currentTime >= s.start_ms && currentTime < s.end_ms
    )
    setActiveIndex(idx)

    // Auto-scroll to keep active segment visible
    if (idx >= 0 && listRef.current) {
      const el = listRef.current.children[idx] as HTMLElement
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [currentTime, segments])

  if (!segments.length) {
    return <div className="transcript-panel empty">No transcript loaded</div>
  }

  return (
    <div className="transcript-panel" ref={listRef}>
      {segments.map((seg, i) => {
        const isActive = i === activeIndex
        const isHighlighted =
          highlightedRange &&
          seg.start_ms >= highlightedRange.start &&
          seg.end_ms <= highlightedRange.end

        return (
          <div
            key={i}
            className={`transcript-segment ${isActive ? 'active' : ''} ${isHighlighted ? 'highlighted' : ''}`}
            onClick={() => onSeek?.(seg.start_ms)}
          >
            <span className="segment-time">{formatTime(seg.start_ms)}</span>
            <span className="segment-text">{seg.text}</span>
          </div>
        )
      })}
    </div>
  )
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export default TranscriptPanel
