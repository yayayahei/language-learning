import { useState, useRef, useEffect } from 'react'

type Props = {
  pdfId?: string
}

function FloatingDict({ pdfId }: Props) {
  const [word, setWord] = useState('')
  const [translation, setTranslation] = useState('')
  const [audioUS, setAudioUS] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedLabel, setSavedLabel] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === '/') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const handleLookup = async () => {
    const q = word.trim()
    if (!q) return
    setLoading(true)
    setTranslation('')
    setSavedLabel('')
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: q }),
      })
      const data = await res.json()
      setTranslation(data.translation || 'No translation found')
      setAudioUS(data.audio_us || '')
    } catch {
      setTranslation('Lookup failed')
    }
    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleLookup()
    } else if (e.key === 'Escape') {
      setWord('')
      setTranslation('')
      setSavedLabel('')
      inputRef.current?.blur()
    }
  }

  const handleSave = async (endpoint: string) => {
    if (!pdfId) return
    setSaving(true)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: word.trim(),
          sentence: word.trim(),
          timestamp_ms: 0,
          source_type: 'pdf',
          source_id: pdfId,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.repeat) {
          setSavedLabel(`Added again (${data.repeat_count} times)`)
        } else {
          setSavedLabel('Saved')
        }
      } else {
        setSavedLabel('Save failed')
      }
    } catch {
      setSavedLabel('Save failed')
    }
    setSaving(false)
  }

  return (
    <div className="floating-dict">
      <div className="floating-dict-input-wrap">
        <input
          ref={inputRef}
          className="floating-dict-input"
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type word, Enter to look up..."
        />
        {loading && <span className="floating-dict-spinner" />}
        {audioUS && (
          <button className="floating-dict-speaker" onClick={() => new Audio(audioUS).play()} title="Play US">🔊</button>
        )}
      </div>
      {translation && (
        <div className="floating-dict-result">
          <div className="floating-dict-translation">{translation}</div>
          {savedLabel ? (
            <div className="floating-dict-saved">{savedLabel}</div>
          ) : (
            <div className="floating-dict-actions">
              <button onClick={() => handleSave('/api/weak-points')} disabled={saving}>Weak point</button>
              <button onClick={() => handleSave('/api/precious-usages')} disabled={saving}>Precious usage</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default FloatingDict
