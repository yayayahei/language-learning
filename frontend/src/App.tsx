import { Routes, Route, Link } from 'react-router-dom'
import VideoPage from './pages/VideoPage'
import WeakPointsPage from './pages/WeakPointsPage'
import TrainingPage from './pages/TrainingPage'
import RewatchPage from './pages/RewatchPage'
import HistoryPage from './pages/HistoryPage'

function App() {
  return (
    <div className="app">
      <nav>
        <Link to="/">Watch</Link>
        <Link to="/weak-points">Weak Points</Link>
        <Link to="/training">Training</Link>
        <Link to="/history">History</Link>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<VideoPage />} />
          <Route path="/weak-points" element={<WeakPointsPage />} />
          <Route path="/training" element={<TrainingPage />} />
          <Route path="/rewatch/:videoId" element={<RewatchPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
