import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import './AdminVerificationPanel.css'

function AdminVerificationPanel() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(true)
  const [organizations, setOrganizations] = useState([])
  const [filter, setFilter] = useState('pending_verification')
  const [processing, setProcessing] = useState({})

  // Simple admin check - en producción esto debería ser más robusto
  const isAdmin = user?.email === 'admin@devotion.com' || user?.user_metadata?.role === 'admin'

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard')
      return
    }
    loadOrganizations()
  }, [filter, isAdmin])

  const loadOrganizations = async () => {
    setLoading(true)
    try {
      // Mock data para demostración
      // En producción, esto sería una llamada a una API backend
      const mockOrgs = [
        {
          id: '1',
          email: 'contacto@fundacioneducativa.org',
          email_confirmed_at: '2024-01-15T10:00:00Z',
          created_at: '2024-01-15T09:30:00Z',
          organization_name: 'Fundación Educativa Guatemala',
          country: 'GT',
          phone: '+502 2234-5678',
          website: 'https://fundacioneducativa.org',
          facebook: 'fundacioneducativagt',
          instagram: '@fundacioneducativagt',
          description: 'Organización dedicada a mejorar la educación en comunidades rurales de Guatemala',
          event_types: 'Talleres educativos, conferencias, capacitaciones',
          expected_attendance: '101-250',
          status: 'pending_verification'
        },
        {
          id: '2', 
          email: 'admin@ongambiental.org',
          email_confirmed_at: '2024-01-14T15:30:00Z',
          created_at: '2024-01-14T15:00:00Z',
          organization_name: 'ONG Ambiental Verde',
          country: 'MX',
          phone: '+52 55 1234-5678',
          website: 'https://ongambiental.org',
          description: 'Organización enfocada en la conservación del medio ambiente',
          event_types: 'Webinars ambientales, charlas de concienciación',
          expected_attendance: '51-100',
          status: 'approved',
          reviewed_at: '2024-01-15T08:00:00Z',
          reviewed_by: 'admin@devotion.com'
        }
      ].filter(org => filter === 'all' || org.status === filter)

      setOrganizations(mockOrgs)
    } catch (error) {
      console.error('Error loading organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateOrganizationStatus = async (userId, status, rejectionReason = null) => {
    setProcessing(prev => ({ ...prev, [userId]: true }))
    
    try {
      // Mock implementation - en producción sería una llamada a API
      setTimeout(() => {
        setOrganizations(prev => prev.map(org => 
          org.id === userId 
            ? { 
                ...org, 
                status, 
                reviewed_at: new Date().toISOString(),
                reviewed_by: user.email,
                ...(rejectionReason && { rejection_reason: rejectionReason })
              }
            : org
        ))
        setProcessing(prev => ({ ...prev, [userId]: false }))
        
        alert(`Organización ${status === 'approved' ? 'aprobada' : 'rechazada'} exitosamente`)
      }, 1000)

    } catch (error) {
      console.error(`Error updating organization status:`, error)
      alert(`Error al ${status === 'approved' ? 'aprobar' : 'rechazar'} la organización`)
      setProcessing(prev => ({ ...prev, [userId]: false }))
    }
  }

  const handleApprove = (userId) => {
    if (confirm('¿Estás seguro de que quieres aprobar esta organización?')) {
      updateOrganizationStatus(userId, 'approved')
    }
  }

  const handleReject = (userId) => {
    const reason = prompt('Motivo del rechazo (opcional):')
    if (reason !== null) { // null means user cancelled
      updateOrganizationStatus(userId, 'rejected', reason || 'No cumple con los criterios de elegibilidad')
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending_verification: { color: '#fbbf24', text: 'Pendiente', icon: 'hourglass_empty' },
      approved: { color: '#10b981', text: 'Aprobada', icon: 'check_circle' },
      rejected: { color: '#ef4444', text: 'Rechazada', icon: 'cancel' }
    }
    const badge = badges[status] || badges.pending_verification
    
    return (
      <span className="status-badge" style={{ color: badge.color }}>
        <span className="material-icons">{badge.icon}</span>
        {badge.text}
      </span>
    )
  }

  if (!isAdmin) {
    return (
      <div className="admin-panel">
        <div className="access-denied">
          <h1>Acceso Denegado</h1>
          <p>No tienes permisos para acceder a este panel</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-panel">
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo">
            <span className="material-icons logo-icon">theater_comedy</span>
            <span className="logo-text">Stage Admin</span>
          </div>
          <div className="nav-actions">
            <button className="btn-nav-secondary" onClick={() => navigate('/dashboard')}>
              <span className="material-icons">dashboard</span>
              Dashboard
            </button>
            <button className="btn-nav-secondary" onClick={signOut}>
              <span className="material-icons">logout</span>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>

      <div className="admin-container">
        <div className="admin-header">
          <h1>Panel de Verificación</h1>
          <p>Gestiona las solicitudes de organizaciones para usar Stage</p>
        </div>

        <div className="filters">
          <button 
            className={`filter-btn ${filter === 'pending_verification' ? 'active' : ''}`}
            onClick={() => setFilter('pending_verification')}
          >
            <span className="material-icons">hourglass_empty</span>
            Pendientes
          </button>
          <button 
            className={`filter-btn ${filter === 'approved' ? 'active' : ''}`}
            onClick={() => setFilter('approved')}
          >
            <span className="material-icons">check_circle</span>
            Aprobadas
          </button>
          <button 
            className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`}
            onClick={() => setFilter('rejected')}
          >
            <span className="material-icons">cancel</span>
            Rechazadas
          </button>
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            <span className="material-icons">list</span>
            Todas
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <span className="material-icons spinning">sync</span>
            Cargando organizaciones...
          </div>
        ) : organizations.length === 0 ? (
          <div className="empty-state">
            <span className="material-icons">inbox</span>
            <h3>No hay organizaciones</h3>
            <p>No se encontraron organizaciones con el filtro seleccionado</p>
          </div>
        ) : (
          <div className="organizations-grid">
            {organizations.map(org => (
              <div key={org.id} className="organization-card">
                <div className="org-header">
                  <div className="org-info">
                    <h3>{org.organization_name}</h3>
                    <p className="org-email">{org.email}</p>
                  </div>
                  {getStatusBadge(org.status)}
                </div>

                <div className="org-details">
                  <div className="detail-item">
                    <span className="label">País:</span>
                    <span className="value">{org.country}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Teléfono:</span>
                    <span className="value">{org.phone || 'No proporcionado'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Sitio Web:</span>
                    <span className="value">{org.website || 'No proporcionado'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Descripción:</span>
                    <span className="value description">{org.description}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Tipos de Eventos:</span>
                    <span className="value">{org.event_types || 'No especificado'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Asistencia Esperada:</span>
                    <span className="value">{org.expected_attendance || 'No especificado'}</span>
                  </div>
                </div>

                <div className="org-meta">
                  <div className="meta-item">
                    <span className="material-icons">schedule</span>
                    <span>Registro: {formatDate(org.created_at)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="material-icons">{org.email_confirmed_at ? 'verified' : 'email'}</span>
                    <span>{org.email_confirmed_at ? 'Email confirmado' : 'Email pendiente'}</span>
                  </div>
                  {org.reviewed_at && (
                    <div className="meta-item">
                      <span className="material-icons">person</span>
                      <span>Revisado: {formatDate(org.reviewed_at)} por {org.reviewed_by}</span>
                    </div>
                  )}
                </div>

                {org.rejection_reason && (
                  <div className="rejection-reason">
                    <span className="material-icons">info</span>
                    <span>Motivo: {org.rejection_reason}</span>
                  </div>
                )}

                {org.status === 'pending_verification' && (
                  <div className="org-actions">
                    <button 
                      className="btn-approve"
                      onClick={() => handleApprove(org.id)}
                      disabled={processing[org.id]}
                    >
                      <span className="material-icons">check</span>
                      {processing[org.id] ? 'Aprobando...' : 'Aprobar'}
                    </button>
                    <button 
                      className="btn-reject"
                      onClick={() => handleReject(org.id)}
                      disabled={processing[org.id]}
                    >
                      <span className="material-icons">close</span>
                      {processing[org.id] ? 'Rechazando...' : 'Rechazar'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminVerificationPanel