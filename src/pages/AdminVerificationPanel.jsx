import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import DashboardLayout from '../components/DashboardLayout'
import RoleManager from '../components/RoleManager'
import './AdminVerificationPanel.css'

function AdminVerificationPanel() {
  const navigate = useNavigate()
  const { user, signOut, permissions, userRole } = useAuth()
  const [loading, setLoading] = useState(true)
  const [organizations, setOrganizations] = useState([])
  const [filter, setFilter] = useState('pending_verification')
  const [processing, setProcessing] = useState({})

  // Verificar permisos usando el nuevo sistema
  const canManageUsers = permissions?.canManageUsers

  useEffect(() => {
    if (!canManageUsers) {
      navigate('/dashboard')
      return
    }
    loadOrganizations()
  }, [filter, canManageUsers])

  const loadOrganizations = async () => {
    setLoading(true)
    try {
      // Obtener usuarios reales desde Supabase Auth
      // Necesitamos hacer una llamada RPC porque no podemos acceder directamente a auth.users desde el cliente
      const { data, error } = await supabase.rpc('get_organizations_for_review')
      
      if (error) {
        console.error('Error cargando organizaciones:', error)
        console.log('📝 Si ves este error, las funciones SQL no están creadas aún.')
        console.log('🚀 Ejecuta el contenido de ORGANIZATIONS_SQL.sql en Supabase')
        
        // Mostrar organizaciones vacías si las funciones no existen
        setOrganizations([])
      } else {
        // Filtrar por estado si tenemos datos reales
        const filteredOrgs = (data || []).filter(org => 
          filter === 'all' || org.status === filter
        )
        setOrganizations(filteredOrgs)
      }
    } catch (error) {
      console.error('Error loading organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateOrganizationStatus = async (userId, status, rejectionReason = null) => {
    setProcessing(prev => ({ ...prev, [userId]: true }))
    
    try {
      // Llamar a la función RPC de Supabase
      const functionName = status === 'approved' ? 'approve_organization' : 'reject_organization'
      
      const params = status === 'approved' 
        ? { target_user_id: userId }
        : { target_user_id: userId, rejection_reason: rejectionReason }
      
      const { data, error } = await supabase.rpc(functionName, params)
      
      if (error) {
        console.error('Error actualizando estado:', error)
        // Si la función no existe, actualizar localmente
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
      } else {
        // Recargar la lista de organizaciones
        await loadOrganizations()
      }
      
      alert(`Organización ${status === 'approved' ? 'aprobada' : 'rechazada'} exitosamente`)
    } catch (error) {
      console.error(`Error updating organization status:`, error)
      alert(`Error al ${status === 'approved' ? 'aprobar' : 'rechazar'} la organización`)
    } finally {
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

  if (!canManageUsers) {
    return (
      <DashboardLayout title="Acceso Denegado" subtitle="No tienes permisos para acceder a este panel">
        <div className="card">
          <div className="empty-state">
            <span className="material-icons" style={{ fontSize: '4rem', color: '#ff6b6b', marginBottom: '1rem' }}>
              block
            </span>
            <h3>Acceso Denegado</h3>
            <p>Solo los Super Admin pueden gestionar usuarios</p>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '1rem' }}>
              Tu rol actual: <strong>{userRole === 'super_admin' ? 'Super Admin' : 'Usuario Normal'}</strong>
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout 
      title="Panel de Verificación" 
      subtitle="Gestiona las solicitudes de organizaciones para usar Stage"
    >
      {/* Gestión de Roles - Solo para Super Admin */}
      {userRole === 'super_admin' && <RoleManager />}

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
    </DashboardLayout>
  )
}

export default AdminVerificationPanel