import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'authed' | 'unauthed'>('loading')

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => setStatus(r.ok ? 'authed' : 'unauthed'))
      .catch(() => setStatus('unauthed'))
  }, [])

  if (status === 'loading') return null
  if (status === 'unauthed') return <Navigate to="/login" replace />
  return <>{children}</>
}

export default ProtectedRoute
