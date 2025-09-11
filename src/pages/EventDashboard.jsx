import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import '../pages/LandingPage.css'

function EventDashboard({ events, onRefresh }) {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newEvent, setNewEvent] = useState({
    name: '',
    description: '',
    access_code: ''
  })

  const handleCreateEvent = async (e) => {
    e.preventDefault()
    
    try {
      const accessCode = newEvent.access_code || Math.random().toString(36).substring(2, 8).toUpperCase()
      const adminCode = Math.random().toString(36).substring(2, 10).toUpperCase()
      
      const { data, error } = await supabase
        .from('events')
        .insert({
          name: newEvent.name,
          description: newEvent.description,
          access_code: accessCode,
          admin_code: adminCode,
          status: 'active'
        })
        .select()
        .single()
      
      if (error) {
        console.error('Error creating event:', error)
        alert('Error al crear el evento')
      } else {
        alert(`Evento creado! \nCódigo de acceso: ${accessCode}\nCódigo de admin: ${adminCode}`)
        setNewEvent({ name: '', description: '', access_code: '' })
        setShowCreateForm(false)
        onRefresh()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const getEventStatus = (event) => {
    if (!event.status) return 'upcoming'
    return event.status
  }

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <span className="material-icons logo-icon">theater_comedy</span>
            <span className="logo-text">Stage</span>
          </div>
          <div className="nav-links">
            {isAdmin && (
              <button 
                className="btn btn-primary" 
                onClick={() => navigate('/admin-verification')}
                style={{ marginRight: '1rem' }}
              >
                <span className="material-icons" style={{ marginRight: '0.5rem' }}>admin_panel_settings</span>
                Gestión Usuarios
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => navigate('/')}>
              Inicio
            </button>
          </div>
        </div>
      </nav>
      
      <div className="dashboard-inner" style={{ paddingTop: '5rem' }}>
      <div className="card">
        <h1>Panel de Control</h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '2rem' }}>
          Gestiona tus eventos y modera las preguntas en tiempo real
        </p>
        
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancelar' : 'Crear Nuevo Evento'}
        </button>

        {showCreateForm && (
          <form onSubmit={handleCreateEvent} style={{ marginTop: '2rem' }}>
            <div className="input-group">
              <label>Nombre del Evento</label>
              <input
                type="text"
                value={newEvent.name}
                onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                required
                placeholder="Ej: Conferencia Tech 2024"
              />
            </div>
            
            <div className="input-group">
              <label>Descripción</label>
              <textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                rows="3"
                placeholder="Describe tu evento..."
              />
            </div>
            
            <div className="input-group">
              <label>Código de Acceso (opcional)</label>
              <input
                type="text"
                value={newEvent.access_code}
                onChange={(e) => setNewEvent({ ...newEvent, access_code: e.target.value })}
                placeholder="Dejar vacío para generar automáticamente"
              />
            </div>
            
            <button type="submit" className="btn btn-primary">
              Crear Evento
            </button>
          </form>
        )}
      </div>

      <div className="card">
        <h2>Eventos Activos</h2>
        
        {events.length === 0 ? (
          <div className="empty-state">
            <h3>No hay eventos activos</h3>
            <p>Crea tu primer evento para comenzar a recibir preguntas del público</p>
          </div>
        ) : (
          <div className="event-grid">
            {events.map((event) => (
              <div 
                key={event.id} 
                className="event-card"
                onClick={() => navigate(`/admin/${event.id}`)}
              >
                <span className={`event-status ${getEventStatus(event)}`}>
                  {getEventStatus(event)}
                </span>
                <h3>{event.name}</h3>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '1rem' }}>
                  {event.description}
                </p>
                <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                  <p>Código de acceso: <strong style={{ color: '#8338ec' }}>{event.access_code}</strong></p>
                  <p>Código admin: <strong style={{ color: '#ff006e' }}>{event.admin_code}</strong></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

export default EventDashboard