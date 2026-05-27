import { useState, useEffect } from 'react'

type PreciousUsage = {
  id: number
  text: string
  pu_type: 'word' | 'phrase' | 'expression'
  source_type: 'video' | 'pdf'
  source_id: string
  sentence: string
  created_at: string
}

function PreciousUsagePage() {
  const [items, setItems] = useState<PreciousUsage[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')

  const fetchItems = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filter) params.set('type', filter)

    fetch(`/api/precious-usages?${params}`)
      .then((r) => r.json())
      .then((data) => setItems(data.precious_usages || []))
  }

  useEffect(() => {
    fetchItems()
  }, [search, filter])

  const handleDelete = async (id: number) => {
    await fetch(`/api/precious-usages/${id}`, { method: 'DELETE' })
    fetchItems()
  }

  const typeLabel = (t: string) => {
    if (t === 'word') return 'W'
    if (t === 'phrase') return 'P'
    return 'E'
  }

  return (
    <div className="precious-usage-page">
      <h2>Precious Usage</h2>

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
          <option value="expression">Expression</option>
        </select>
      </div>

      <div className="pu-list">
        {items.map((item) => (
          <div key={item.id} className="pu-item">
            <span className={`pu-type-badge ${item.pu_type}`}>{typeLabel(item.pu_type)}</span>
            <span className="pu-text">{item.text}</span>
            <span className="pu-source">{item.source_type === 'pdf' ? 'PDF' : 'Video'}</span>
            <span className="pu-date">{new Date(item.created_at).toLocaleDateString()}</span>
            <button className="delete-btn" onClick={() => handleDelete(item.id)}>
              x
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="empty">No precious usages saved yet</p>}
      </div>
    </div>
  )
}

export default PreciousUsagePage
