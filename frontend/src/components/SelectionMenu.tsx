import { useState, useEffect, useRef } from 'react'

type SelectionMenuProps = {
  text: string
  x: number
  y: number
  pageNum: number
  pdfId: string
  onClose: () => void
}

type Action = 'weak-point' | 'precious-usage' | null

function SelectionMenu({ text, x, y, pageNum, pdfId, onClose }: SelectionMenuProps) {
  const [action, setAction] = useState<Action>(null)
  const [wpType, setWpType] = useState('word')
  const [puType, setPuType] = useState('word')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
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

  const handleSaveWeakPoint = async () => {
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

  const handleSavePreciousUsage = async () => {
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

  if (done) {
    return (
      <div className="selection-menu" style={{ left: x, top: y }} ref={menuRef}>
        <div className="selection-done">Saved!</div>
        <button onClick={onClose}>Close</button>
      </div>
    )
  }

  // Step 1: Choose action
  if (!action) {
    return (
      <div className="selection-menu" style={{ left: x, top: y }} ref={menuRef}>
        <div className="selection-text">"{text.slice(0, 50)}{text.length > 50 ? '...' : ''}"</div>
        <button onClick={() => setAction('weak-point')}>Add to Weak Points</button>
        <button onClick={() => setAction('precious-usage')}>Save as Precious Usage</button>
      </div>
    )
  }

  // Step 2: Pick type and confirm
  if (action === 'weak-point') {
    return (
      <div className="selection-menu" style={{ left: x, top: y }} ref={menuRef}>
        <div className="selection-text">Add to Weak Points</div>
        <div className="popup-type">
          <label><input type="radio" name="wp-type" value="word" checked={wpType === 'word'} onChange={() => setWpType('word')} /> Word</label>
          <label><input type="radio" name="wp-type" value="phrase" checked={wpType === 'phrase'} onChange={() => setWpType('phrase')} /> Phrase</label>
          <label><input type="radio" name="wp-type" value="idiom" checked={wpType === 'idiom'} onChange={() => setWpType('idiom')} /> Idiom</label>
        </div>
        <div className="selection-actions">
          <button onClick={handleSaveWeakPoint} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div className="selection-menu" style={{ left: x, top: y }} ref={menuRef}>
      <div className="selection-text">Save to Precious Usage</div>
      <div className="popup-type">
        <label><input type="radio" name="pu-type" value="word" checked={puType === 'word'} onChange={() => setPuType('word')} /> Word</label>
        <label><input type="radio" name="pu-type" value="phrase" checked={puType === 'phrase'} onChange={() => setPuType('phrase')} /> Phrase</label>
        <label><input type="radio" name="pu-type" value="expression" checked={puType === 'expression'} onChange={() => setPuType('expression')} /> Expression</label>
      </div>
      <div className="selection-actions">
        <button onClick={handleSavePreciousUsage} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}

export default SelectionMenu
