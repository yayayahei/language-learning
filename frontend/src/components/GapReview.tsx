import { useState } from 'react'

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

function GapReview({ groups, videoId, onClose }: Props) {
  const [selections, setSelections] = useState<Map<string, string>>(new Map())
  const [saving, setSaving] = useState(false)

  const handleSelect = (segmentIndex: number, text: string) => {
    const key = `${segmentIndex}`
    const newMap = new Map(selections)
    if (newMap.get(key) === text) {
      newMap.delete(key)
    } else {
      newMap.set(key, text)
    }
    setSelections(newMap)
  }

  const handleSave = async (type: 'word' | 'phrase' | 'idiom') => {
    if (selections.size === 0) return
    setSaving(true)

    const selectedTexts = Array.from(selections.entries())
    // Find the segment that contains each selection
    for (const [segIdx, text] of selectedTexts) {
      const segmentIndex = parseInt(segIdx)
      // Find which group and segment
      let sentence = ''
      let timestamp = 0
      for (const group of groups) {
        const seg = group.segments[segmentIndex]
        if (seg) {
          sentence = seg.text
          timestamp = seg.start_ms
          break
        }
      }

      await fetch('/api/weak-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          wp_type: type,
          video_id: videoId,
          sentence,
          timestamp_ms: timestamp,
        }),
      })
    }
    setSaving(false)
    onClose()
  }

  return (
    <div className="gap-review-overlay">
      <div className="gap-review">
        <h3>Comprehension Gaps</h3>
        <p className="hint">
          You paused or rewound near these sentences. Click words/phrases you didn't understand.
        </p>

        {groups.map((group, gi) => (
          <div key={gi} className="gap-group">
            <div className="gap-time">
              {formatTime(group.startMs)} - {formatTime(group.endMs)}
            </div>
            {group.segments.map((seg, si) => (
              <div key={si} className="gap-sentence">
                {seg.text.split(' ').map((word, wi) => {
                  const fullWord = word.trim()
                  if (!fullWord) return null
                  const isSelected = selections.get(`${group.segments.indexOf(seg)}`) === fullWord
                  return (
                    <span
                      key={wi}
                      className={`clickable-word ${isSelected ? 'selected' : ''}`}
                      onClick={() =>
                        handleSelect(group.segments.indexOf(seg), fullWord)
                      }
                    >
                      {word}{' '}
                    </span>
                  )
                })}
              </div>
            ))}
          </div>
        ))}

        {selections.size > 0 && (
          <div className="save-actions">
            <span>Save as:</span>
            <button onClick={() => handleSave('word')} disabled={saving}>
              Word
            </button>
            <button onClick={() => handleSave('phrase')} disabled={saving}>
              Phrase
            </button>
            <button onClick={() => handleSave('idiom')} disabled={saving}>
              Idiom
            </button>
          </div>
        )}

        <button className="close-btn" onClick={onClose}>
          Close
        </button>
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
