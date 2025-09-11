import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function ProtectedRoute({ children }) {
  const { user, loading, isApproved, isPending, isRejected } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <span className="material-icons spinning" style={{ fontSize: '3rem', color: '#8338ec' }}>
            sync
          </span>
          <p style={{ marginTop: '1rem' }}>Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Allow access to status page and admin panel regardless of verification status
  if (location.pathname === '/status' || location.pathname === '/admin-verification') {
    return children
  }

  // Check if user is admin
  const isAdmin = user?.email === 'admin@devotion.com' || user?.user_metadata?.role === 'admin'
  
  // Redirect non-approved users to status page
  if (!isApproved && !isAdmin) {
    return <Navigate to="/status" replace />
  }

  return children
}

export default ProtectedRoute