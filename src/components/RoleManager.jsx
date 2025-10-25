import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

function RoleManager() {
  const { userRole, assignUserRole } = useAuth()
  const [targetEmail, setTargetEmail] = useState('')
  const [selectedRole, setSelectedRole] = useState('user')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const availableRoles = [
    { value: 'user', label: 'Usuario Normal', description: 'Acceso estándar al sistema' },
    { value: 'super_admin', label: 'Super Admin', description: 'Acceso completo y gestión de usuarios' }
  ]

  const handleAssignRole = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { error } = await assignUserRole(targetEmail, selectedRole)
      
      if (error) {
        setMessage(`Error: ${error.message}`)
      } else {
        setMessage(`✅ Rol "${selectedRole}" asignado exitosamente a ${targetEmail}`)
        setTargetEmail('')
        setSelectedRole('user')
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Solo super_admin puede asignar roles
  if (userRole !== 'super_admin') {
    return (
      <div className="card">
        <div className="empty-state">
          <span className="material-icons" style={{ fontSize: '3rem', color: '#ff6b6b', marginBottom: '1rem' }}>
            security
          </span>
          <h3>Gestión de Roles</h3>
          <p>Solo los Super Administradores pueden asignar roles</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>Gestión de Roles</h2>
      <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '2rem' }}>
        Asigna roles específicos a usuarios del sistema
      </p>

      <form onSubmit={handleAssignRole}>
        <div className="input-group">
          <label>Email del Usuario</label>
          <input
            type="email"
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            required
            placeholder="ejemplo@email.com"
          />
        </div>

        <div className="input-group">
          <label>Rol a Asignar</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '0.875rem'
            }}
          >
            {availableRoles.map(role => (
              <option key={role.value} value={role.value} style={{ background: '#1a1a1a' }}>
                {role.label} - {role.description}
              </option>
            ))}
          </select>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading || !targetEmail}
        >
          {loading ? 'Asignando...' : 'Asignar Rol'}
        </button>
      </form>

      {message && (
        <div 
          className="message"
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            borderRadius: '8px',
            background: message.startsWith('✅') 
              ? 'rgba(16, 185, 129, 0.1)' 
              : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${message.startsWith('✅') 
              ? 'rgba(16, 185, 129, 0.3)' 
              : 'rgba(239, 68, 68, 0.3)'}`,
            color: message.startsWith('✅') ? '#10b981' : '#ef4444'
          }}
        >
          {message}
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <h3>Roles Disponibles</h3>
        <div className="roles-info">
          <div className="role-info-card">
            <h4>👤 Usuario Normal</h4>
            <p>Acceso estándar: puede crear y gestionar eventos, ver dashboard</p>
          </div>
          <div className="role-info-card special">
            <h4>🌟 Super Admin</h4>
            <p>Acceso completo: gestión de usuarios, todos los permisos</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RoleManager