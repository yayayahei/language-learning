import { Routes, Route, Link } from 'react-router-dom'
import VideoPage from './pages/VideoPage'
import WeakPointsPage from './pages/WeakPointsPage'
import TrainingPage from './pages/TrainingPage'
import RewatchPage from './pages/RewatchPage'
import HistoryPage from './pages/HistoryPage'
import PdfPage from './pages/PdfPage'
import PreciousUsagePage from './pages/PreciousUsagePage'

function App() {
  return (
    <div className="app">
      <nav>
        <span className="nav-group">
          <Link to="/">Watch</Link>
          <Link to="/history" title="Watch History" className="icon-link">&#128337;</Link>
        </span>
        <Link to="/pdf">PDF</Link>
        <Link to="/weak-points">Weak Points</Link>
        <Link to="/precious-usages">Precious Usage</Link>
        <Link to="/training">Training</Link>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<VideoPage />} />
          <Route path="/pdf" element={<PdfPage />} />
          <Route path="/pdf/:pdfId" element={<PdfPage />} />
          <Route path="/weak-points" element={<WeakPointsPage />} />
          <Route path="/precious-usages" element={<PreciousUsagePage />} />
          <Route path="/training" element={<TrainingPage />} />
          <Route path="/rewatch/:videoId" element={<RewatchPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
