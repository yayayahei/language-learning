import { useState, useEffect, useRef } from 'react'

type Segment = {
  text: string
  start_ms: number
  end_ms: number
}

type InteractionGroup = {
  segments: Segment[]
  startMs: number
  endMs: number
}

type Props = {
  groups: InteractionGroup[]
  videoId: string
  onClose: () => void
}

type SavedItem = {
  text: string
  type: 'word' | 'phrase' | 'idiom'
  sentence: string
  timestampMs: number
}

function GapReview({ groups, videoId, onClose }: Props) {
  const [step, setStep] = useState<'mark' | 'select'>('mark')
  const [marked, setMarked] = useState<Set<string>>(new Set())
  const [popup, setPopup] = useState<{
    text: string
    sentence: string
    timestampMs: number
    x: number
    y: number
  } | null>(null)
  const [mode, setMode] = useState<'word' | 'phrase' | 'idiom'>('phrase')
  const [saved, setSaved] = useState<SavedItem[]>([])
  const [saving, setSaving] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)

  // Flatten all segments with group info
  const allSegments: { seg: Segment; gi: number; si: number }[] = []
  for (let gi = 0; gi < groups.length; gi++) {
    for (let si = 0; si < groups[gi].segments.length; si++) {
      allSegments.push({ seg: groups[gi].segments[si], gi, si })
    }
  }

  // Marked segments for step 2
  const markedSegments = allSegments.filter((s) => marked.has(`${s.gi}-${s.si}`))

  // --- Step 1: Mark sentences ---

  const toggleMark = (gi: number, si: number) => {
    const key = `${gi}-${si}`
    const next = new Set(marked)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    setMarked(next)
  }

  // --- Step 2: Text selection popup ---

  useEffect(() => {
    if (step !== 'select') return

    const handleMouseUp = () => {
      const sel = document.getSelection()
      if (!sel || sel.isCollapsed || !sel.toString().trim()) return

      const selectedText = sel.toString().trim()

      const container = document.getElementById('gap-review-select-area')
      if (!container || !container.contains(sel.anchorNode)) return

      const range = sel.getRangeAt(0)
      const startNode = range.startContainer

      let el: HTMLElement | null =
        startNode.nodeType === Node.ELEMENT_NODE
          ? (startNode as HTMLElement)
          : startNode.parentElement

      while (el && !el.dataset.segmentStartMs) {
        el = el.parentElement
      }

      const timestampMs = el ? parseInt(el.dataset.segmentStartMs || '0') : 0
      const sentence = el?.dataset.segmentText || selectedText

      const rect = range.getBoundingClientRect()
      setPopup({
        text: selectedText,
        sentence,
        timestampMs,
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8 + window.scrollY,
      })
    }

    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [step])

  // Dismiss popup on Escape or click outside
  useEffect(() => {
    if (!popup) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPopup(null)
        document.getSelection()?.removeAllRanges()
      }
    }
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopup(null)
        document.getSelection()?.removeAllRanges()
      }
    }

    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [popup])

  const handleSave = async () => {
    if (!popup) return
    setSaving(true)

    await fetch('/api/weak-points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: popup.text,
        wp_type: mode,
        video_id: videoId,
        sentence: popup.sentence,
        timestamp_ms: popup.timestampMs,
      }),
    })

    setSaved((prev) => [
      ...prev,
      { text: popup.text, type: mode, sentence: popup.sentence, timestampMs: popup.timestampMs },
    ])
    setPopup(null)
    setSaving(false)
    document.getSelection()?.removeAllRanges()
  }

  return (
    <div className="gap-review-overlay">
      <div className="gap-review">
        <h3>Comprehension Gaps</h3>

        {/* Step indicator */}
        <div className="step-indicator">
          <div className={`step ${step === 'mark' ? 'active' : ''}`}>
            <span className="step-num">1</span>
            <span className="step-label">
              Mark unclear sentences{step === 'mark' && marked.size > 0 ? ` (${marked.size})` : ''}
            </span>
          </div>
          <div className="step-divider" />
          <div className={`step ${step === 'select' ? 'active' : ''}`}>
            <span className="step-num">2</span>
            <span className="step-label">Select words/phrases</span>
          </div>
        </div>

        {/* Step 1: Mark sentences */}
        {step === 'mark' && (
          <>
            <p className="hint">
              Click sentences that contain something you don't understand.
            </p>
            <div id="gap-review-mark-area">
              {groups.map((group, gi) => (
                <div key={gi} className="gap-group">
                  <div className="gap-time">
                    {formatTime(group.startMs)} - {formatTime(group.endMs)}
                  </div>
                  {group.segments.map((seg, si) => {
                    const isMarked = marked.has(`${gi}-${si}`)
                    return (
                      <div
                        key={si}
                        className={`markable-sentence ${isMarked ? 'marked' : ''}`}
                        onClick={() => toggleMark(gi, si)}
                      >
                        <span className="sentence-time">{formatTime(seg.start_ms)}</span>
                        <span className="sentence-text">{seg.text}</span>
                        {isMarked && <span className="mark-icon">&#10003;</span>}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            <div className="step-actions">
              <button className="close-btn" onClick={onClose}>Close</button>
              <button
                onClick={() => setStep('select')}
                disabled={marked.size === 0}
              >
                Next: Select words ({marked.size})
              </button>
            </div>
          </>
        )}

        {/* Step 2: Select words/phrases in marked sentences */}
        {step === 'select' && (
          <>
            <p className="hint">
              <strong>Drag-select</strong> the word, phrase, or idiom you didn't understand.
            </p>

            {markedSegments.length === 0 ? (
              <p className="empty">No sentences marked. Go back and mark some.</p>
            ) : (
              <div id="gap-review-select-area">
                {groups.map((group, gi) => {
                  const hasMarked = group.segments.some((_, si) => marked.has(`${gi}-${si}`))
                  if (!hasMarked) return null
                  return (
                    <div key={gi} className="gap-group">
                      <div className="gap-time">
                        {formatTime(group.startMs)} - {formatTime(group.endMs)}
                      </div>
                      <div className="gap-text-block">
                        {group.segments.map((seg, si) => {
                          const key = `${gi}-${si}`
                          const isMarked = marked.has(key)
                          if (!isMarked) return null
                          return (
                            <span
                              key={si}
                              className="gap-segment"
                              data-segment-start-ms={seg.start_ms}
                              data-segment-text={seg.text}
                            >
                              {seg.text}{' '}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Floating popup */}
            {popup && (
              <div
                ref={popupRef}
                className="selection-popup"
                style={{
                  left: Math.min(popup.x, window.innerWidth - 260),
                  top: Math.min(popup.y, window.innerHeight - 120),
                }}
              >
                <div className="popup-text">"{popup.text}"</div>
                <div className="popup-type">
                  <label>
                    <input type="radio" name="wp-type" value="word" checked={mode === 'word'} onChange={() => setMode('word')} /> Word
                  </label>
                  <label>
                    <input type="radio" name="wp-type" value="phrase" checked={mode === 'phrase'} onChange={() => setMode('phrase')} /> Phrase
                  </label>
                  <label>
                    <input type="radio" name="wp-type" value="idiom" checked={mode === 'idiom'} onChange={() => setMode('idiom')} /> Idiom
                  </label>
                </div>
                <div className="popup-actions">
                  <button onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button className="cancel-btn" onClick={() => { setPopup(null); document.getSelection()?.removeAllRanges() }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Saved summary */}
            {saved.length > 0 && (
              <div className="saved-summary">
                <strong>Saved:</strong>
                {saved.map((item, i) => (
                  <span key={i} className="saved-item">"{item.text}" ({item.type})</span>
                ))}
              </div>
            )}

            <div className="step-actions">
              <button className="secondary-btn" onClick={() => setStep('mark')}>
                Back
              </button>
              <button className="close-btn" onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export default GapReview
