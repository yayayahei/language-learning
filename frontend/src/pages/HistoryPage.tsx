import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

type Video = {
  id: string
  url: string
  title: string
  created_at: string
}

function HistoryPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const navigate = useNavigate()

  const fetchVideos = () => {
    fetch('/api/videos')
      .then((r) => r.json())
      .then((data) => setVideos(data.videos || []))
  }

  useEffect(() => { fetchVideos() }, [])

  const handleDelete = async (id: string) => {
    await fetch(`/api/videos/${id}`, { method: 'DELETE' })
    fetchVideos()
  }

  return (
    <div className="history-page">
      <h2>Watch History</h2>

      <div className="video-list">
        {videos.map((v) => (
          <div key={v.id} className="video-item">
            <div className="video-info">
              <a href={v.url} target="_blank" rel="noopener noreferrer">
                {v.url}
              </a>
              <span className="date">{v.created_at}</span>
            </div>
            <div className="video-actions">
              <button onClick={() => navigate(`/rewatch/${v.id}`)}>
                Re-watch
              </button>
              <button className="danger" onClick={() => handleDelete(v.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {videos.length === 0 && <p className="empty">No videos watched yet</p>}
      </div>
    </div>
  )
}

export default HistoryPage
