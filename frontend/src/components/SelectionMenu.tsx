import { useState, useEffect, useRef } from 'react'

type SelectionMenuProps = {
  text: string
  x: number
  y: number
  pageNum: number
  pdfId: string
  onClose: () => void
}

function SelectionMenu({ text, x, y, pageNum, pdfId, onClose }: SelectionMenuProps) {
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [doneLabel, setDoneLabel] = useState('')
  const [translation, setTranslation] = useState('')
  const [audioUS, setAudioUS] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.translation) setTranslation(data.translation)
        if (data.audio_us) setAudioUS(data.audio_us)
      })
      .catch(() => {})
  }, [text])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const handleSave = async (endpoint: string, label: string) => {
    setSaving(true)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          sentence: text,
          timestamp_ms: pageNum,
          source_type: 'pdf',
          source_id: pdfId,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.repeat) {
          setDoneLabel(`${label} — added again (${data.repeat_count} times)`)
        } else {
          setDoneLabel(`${label} — saved`)
        }
        setDone(true)
      } else {
        alert('Failed to save')
        setSaving(false)
      }
    } catch {
      alert('Network error')
      setSaving(false)
    }
  }

  useEffect(() => {
    if (done) {
      const timer = setTimeout(onClose, 1500)
      return () => clearTimeout(timer)
    }
  }, [done, onClose])

  if (done) {
    return (
      <div className="selection-menu" style={{ left: x, top: y }} ref={menuRef}>
        <div className="selection-done">{doneLabel}</div>
      </div>
    )
  }

  return (
    <div className="selection-menu" style={{ left: x, top: y }} ref={menuRef}>
      <div className="selection-text">
        "{text.slice(0, 50)}{text.length > 50 ? '...' : ''}"
        {audioUS && (
          <button className="selection-speaker" onClick={() => new Audio(audioUS).play()} title="Play US">🔊</button>
        )}
      </div>

      {translation && <div className="selection-translation">{translation}</div>}

      <div className="selection-actions">
        <button onClick={() => handleSave('/api/weak-points', 'Weak point')} disabled={saving}>
          Weak point
        </button>
        <button onClick={() => handleSave('/api/precious-usages', 'Precious usage')} disabled={saving}>
          Precious usage
        </button>
      </div>
    </div>
  )
}

export default SelectionMenu
