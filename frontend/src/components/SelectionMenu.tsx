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
  const menuRef = useRef<HTMLDivElement>(null)

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

  const handleSaveWeakPoint = async (wpType: string) => {
    setSaving(true)
    try {
      const res = await fetch('/api/weak-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          wp_type: wpType,
          sentence: text,
          timestamp_ms: pageNum,
          source_type: 'pdf',
          source_id: pdfId,
        }),
      })
      if (res.ok) {
        setDoneLabel(`Saved as weak point (${wpType})`)
        setDone(true)
      } else {
        alert('Failed to save weak point')
        setSaving(false)
      }
    } catch {
      alert('Network error')
      setSaving(false)
    }
  }

  const handleSavePreciousUsage = async (puType: string) => {
    setSaving(true)
    try {
      const res = await fetch('/api/precious-usages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          pu_type: puType,
          source_type: 'pdf',
          source_id: pdfId,
          sentence: '',
        }),
      })
      if (res.ok) {
        setDoneLabel(`Saved as precious usage (${puType})`)
        setDone(true)
      } else {
        alert('Failed to save precious usage')
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
      <div className="selection-text">"{text.slice(0, 50)}{text.length > 50 ? '...' : ''}"</div>

      <div className="selection-group">
        <div className="selection-group-label">Weak Points</div>
        <div className="selection-types">
          <button onClick={() => handleSaveWeakPoint('word')} disabled={saving}>Word</button>
          <button onClick={() => handleSaveWeakPoint('phrase')} disabled={saving}>Phrase</button>
          <button onClick={() => handleSaveWeakPoint('idiom')} disabled={saving}>Idiom</button>
        </div>
      </div>

      <div className="selection-group">
        <div className="selection-group-label">Precious Usage</div>
        <div className="selection-types">
          <button onClick={() => handleSavePreciousUsage('word')} disabled={saving}>Word</button>
          <button onClick={() => handleSavePreciousUsage('phrase')} disabled={saving}>Phrase</button>
          <button onClick={() => handleSavePreciousUsage('expression')} disabled={saving}>Expression</button>
        </div>
      </div>
    </div>
  )
}

export default SelectionMenu
