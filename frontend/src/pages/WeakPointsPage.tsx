import { useState, useEffect } from 'react'

type WeakPoint = {
  id: number
  text: string
  wp_type: 'word' | 'phrase' | 'idiom'
  video_id: string
  sentence: string
  timestamp_ms: number
  in_training: boolean
  grasped: boolean
  created_at: string
}

function WeakPointsPage() {
  const [points, setPoints] = useState<WeakPoint[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [message, setMessage] = useState('')

  const fetchPoints = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filter) params.set('type', filter)

    fetch(`/api/weak-points?${params}`)
      .then((r) => r.json())
      .then((data) => setPoints(data.weak_points || []))
  }

  useEffect(() => { fetchPoints() }, [search, filter])

  const handleDelete = async (id: number) => {
    await fetch(`/api/weak-points/${id}`, { method: 'DELETE' })
    fetchPoints()
  }

  const handleToggleSelect = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const handleSendToTraining = async () => {
    await fetch('/api/weak-points/train', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected) }),
    })
    setMessage(`Sent ${selected.size} items to training`)
    setSelected(new Set())
    fetchPoints()
  }

  const typeLabel = (t: string) => {
    if (t === 'word') return 'W'
    if (t === 'phrase') return 'P'
    return 'I'
  }

  return (
    <div className="weak-points-page">
      <h2>Weak Points</h2>

      <div className="controls">
        <input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All types</option>
          <option value="word">Word</option>
          <option value="phrase">Phrase</option>
          <option value="idiom">Idiom</option>
        </select>
        {selected.size > 0 && (
          <button onClick={handleSendToTraining}>
            Train Selected ({selected.size})
          </button>
        )}
      </div>

      {message && <div className="message">{message}</div>}

      <div className="wp-list">
        {points.map((wp) => (
          <div key={wp.id} className={`wp-item ${wp.grasped ? 'grasped' : ''} ${wp.in_training ? 'training' : ''}`}>
            <input
              type="checkbox"
              checked={selected.has(wp.id)}
              onChange={() => handleToggleSelect(wp.id)}
              disabled={wp.in_training || wp.grasped}
            />
            <span className={`wp-type-badge ${wp.wp_type}`}>{typeLabel(wp.wp_type)}</span>
            <span className="wp-text">{wp.text}</span>
            <span className="wp-context">...{wp.sentence}...</span>
            <span className="wp-status">
              {wp.grasped ? 'Grasped' : wp.in_training ? 'Training' : 'New'}
            </span>
            <button className="delete-btn" onClick={() => handleDelete(wp.id)}>
              x
            </button>
          </div>
        ))}
        {points.length === 0 && <p className="empty">No weak points yet</p>}
      </div>
    </div>
  )
}

export default WeakPointsPage
