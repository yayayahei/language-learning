import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import VideoPage from './pages/VideoPage'
import WeakPointsPage from './pages/WeakPointsPage'
import TrainingPage from './pages/TrainingPage'
import RewatchPage from './pages/RewatchPage'
import HistoryPage from './pages/HistoryPage'
import PdfPage from './pages/PdfPage'
import PreciousUsagePage from './pages/PreciousUsagePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    navigate('/login')
  }

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
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </nav>
      <main>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/" element={<ProtectedRoute><VideoPage /></ProtectedRoute>} />
          <Route path="/pdf" element={<ProtectedRoute><PdfPage /></ProtectedRoute>} />
          <Route path="/pdf/:pdfId" element={<ProtectedRoute><PdfPage /></ProtectedRoute>} />
          <Route path="/weak-points" element={<ProtectedRoute><WeakPointsPage /></ProtectedRoute>} />
          <Route path="/precious-usages" element={<ProtectedRoute><PreciousUsagePage /></ProtectedRoute>} />
          <Route path="/training" element={<ProtectedRoute><TrainingPage /></ProtectedRoute>} />
          <Route path="/rewatch/:videoId" element={<ProtectedRoute><RewatchPage /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  )
}

export default App
