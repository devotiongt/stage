import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useEffect } from 'react'
import './StatusPage.css'

function StatusPage() {
  const navigate = useNavigate()
  const { user, profile, signOut, refreshUser, isApproved, isPending, isRejected } = useAuth()

  // Auto-refresh if URL has refresh parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('refresh') === '1') {
      console.log('🔄 Auto-refreshing due to URL parameter')
      refreshUser()
      // Remove the parameter from URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const handleRefresh = async () => {
    console.log('🔄 Manual refresh triggered')
    await refreshUser()
  }

  if (isApproved) {
    // Usuario aprobado - redirigir al dashboard
    navigate('/dashboard')
    return null
  }

  if (isPending) {
    return (
      <div className="status-page">
        <nav className="navbar">
          <div className="nav-container">
            <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
              <span className="material-icons logo-icon">theater_comedy</span>
              <span className="logo-text">Stage</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-nav-secondary" onClick={handleRefresh}>
                <span className="material-icons">refresh</span>
                Actualizar
              </button>
              <button className="btn-nav-secondary" onClick={handleSignOut}>
                <span className="material-icons">logout</span>
                Cerrar Sesión
              </button>
            </div>
          </div>
        </nav>

        <div className="status-container">
          <div className="status-card pending">
            <div className="status-icon">
              <span className="material-icons">hourglass_empty</span>
            </div>
            
            <h1>Verificación en Proceso</h1>
            <p className="status-subtitle">Tu solicitud está siendo revisada por nuestro equipo</p>
            
            <div className="organization-info">
              <h3>Información de tu Organización</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Organización:</span>
                  <span className="value">{profile?.organization_name}</span>
                </div>
                <div className="info-item">
                  <span className="label">Email:</span>
                  <span className="value">{user?.email}</span>
                </div>
                <div className="info-item">
                  <span className="label">País:</span>
                  <span className="value">{profile?.country}</span>
                </div>
                <div className="info-item">
                  <span className="label">Descripción:</span>
                  <span className="value">{profile?.description}</span>
                </div>
              </div>
            </div>

            <div className="status-timeline">
              <div className="timeline-item completed">
                <span className="material-icons">check_circle</span>
                <span>Cuenta creada</span>
              </div>
              <div className="timeline-item completed">
                <span className="material-icons">check_circle</span>
                <span>Email confirmado</span>
              </div>
              <div className="timeline-item active">
                <span className="material-icons">schedule</span>
                <span>Verificación en proceso</span>
              </div>
              <div className="timeline-item">
                <span className="material-icons">radio_button_unchecked</span>
                <span>Acceso completo</span>
              </div>
            </div>

            <div className="status-message">
              <p>
                <strong>Tiempo estimado:</strong> 24-48 horas<br/>
                Nuestro equipo está revisando tu información. Te notificaremos por email cuando tu organización sea aprobada.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isRejected) {
    return (
      <div className="status-page">
        <nav className="navbar">
          <div className="nav-container">
            <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
              <span className="material-icons logo-icon">theater_comedy</span>
              <span className="logo-text">Stage</span>
            </div>
            <button className="btn-nav-secondary" onClick={handleSignOut}>
              <span className="material-icons">logout</span>
              Cerrar Sesión
            </button>
          </div>
        </nav>

        <div className="status-container">
          <div className="status-card rejected">
            <div className="status-icon">
              <span className="material-icons">cancel</span>
            </div>
            
            <h1>Solicitud No Aprobada</h1>
            <p className="status-subtitle">Lamentablemente, tu solicitud no ha sido aprobada</p>
            
            <div className="rejection-info">
              <h3>Motivo del Rechazo</h3>
              <p>{profile?.rejection_reason || 'No se cumplieron los criterios de elegibilidad para organizaciones sin fines de lucro.'}</p>
            </div>

            <div className="contact-support">
              <h3>¿Crees que es un error?</h3>
              <p>Si consideras que tu organización cumple con todos los requisitos, puedes contactarnos:</p>
              <button className="btn-primary">
                <span className="material-icons">mail</span>
                Contactar Soporte
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default StatusPage