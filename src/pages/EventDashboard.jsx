import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import DashboardLayout from '../components/DashboardLayout'
import '../pages/LandingPage.css'

function EventDashboard({ events, onRefresh }) {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEventTypeModal, setShowEventTypeModal] = useState(false)
  const [selectedEventType, setSelectedEventType] = useState(null)
  const [createdEvent, setCreatedEvent] = useState(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newEvent, setNewEvent] = useState({
    name: '',
    description: '',
    access_code: '',
    type: 'panel'
  })

  const eventTypes = [
    {
      id: 'panel',
      name: 'Panel de Preguntas',
      description: 'Permite al público hacer preguntas en tiempo real',
      icon: 'question_answer',
      color: '#8338ec'
    }
    // Futuras opciones:
    // {
    //   id: 'poll',
    //   name: 'Encuesta en Vivo',
    //   description: 'Crear encuestas y votaciones interactivas',
    //   icon: 'poll',
    //   color: '#3a86ff'
    // },
    // {
    //   id: 'quiz',
    //   name: 'Quiz Interactivo',
    //   description: 'Juegos de preguntas y respuestas',
    //   icon: 'quiz',
    //   color: '#ff006e'
    // }
  ]

  const handleCreateEventClick = () => {
    setShowEventTypeModal(true)
  }

  const handleEventTypeSelect = (eventType) => {
    setSelectedEventType(eventType)
    setNewEvent({ ...newEvent, type: eventType.id })
    setShowEventTypeModal(false)
    setShowCreateForm(true)
  }

  const handleCreateEvent = async (e) => {
    e.preventDefault()
    setIsCreating(true)
    
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
          type: newEvent.type,
          status: 'active'
        })
        .select()
        .single()
      
      if (error) {
        console.error('Error creating event:', error)
        // TODO: Mostrar error en la interfaz
        alert('Error al crear el evento')
      } else {
        // Guardar el evento creado para mostrar en el modal de éxito
        setCreatedEvent({ ...data, access_code: accessCode })
        setShowSuccessModal(true)
        setNewEvent({ name: '', description: '', access_code: '', type: 'panel' })
        setShowCreateForm(false)
        setSelectedEventType(null)
        onRefresh()
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error inesperado al crear el evento')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCancelCreate = () => {
    setShowCreateForm(false)
    setSelectedEventType(null)
    setNewEvent({ name: '', description: '', access_code: '', type: 'panel' })
  }

  const getEventStatus = (event) => {
    if (!event.status) return 'upcoming'
    return event.status
  }

  return (
    <>
      {/* Modal para seleccionar tipo de evento - Renderizado al nivel raíz */}
      {showEventTypeModal && (
        <div className="modal-overlay" onClick={() => setShowEventTypeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Selecciona el tipo de evento</h2>
              <button 
                className="modal-close"
                onClick={() => setShowEventTypeModal(false)}
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            
            <div className="event-types-grid">
              {eventTypes.map((eventType) => (
                <div 
                  key={eventType.id}
                  className="event-type-card"
                  onClick={() => handleEventTypeSelect(eventType)}
                  style={{ borderColor: eventType.color }}
                >
                  <div className="event-type-icon" style={{ color: eventType.color }}>
                    <span className="material-icons">{eventType.icon}</span>
                  </div>
                  <h3 style={{ color: eventType.color }}>{eventType.name}</h3>
                  <p>{eventType.description}</p>
                  <div className="event-type-badge">
                    Disponible
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de éxito */}
      {showSuccessModal && createdEvent && (
        <div className="modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ color: '#10b981' }}>
                <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: '0.5rem' }}>
                  check_circle
                </span>
                ¡Evento Creado Exitosamente!
              </h2>
              <button 
                className="modal-close"
                onClick={() => setShowSuccessModal(false)}
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#ffffff' }}>{createdEvent.name}</h3>
              
              <div style={{ 
                background: 'rgba(16, 185, 129, 0.1)', 
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <span className="material-icons" style={{ 
                    color: '#10b981', 
                    fontSize: '1.2rem', 
                    verticalAlign: 'middle', 
                    marginRight: '0.5rem' 
                  }}>
                    key
                  </span>
                  <strong style={{ color: '#ffffff' }}>Código de Acceso para Asistentes:</strong>
                </div>
                <div style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold', 
                  color: '#10b981', 
                  letterSpacing: '2px',
                  fontFamily: 'monospace',
                  background: 'rgba(255, 255, 255, 0.1)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px dashed rgba(16, 185, 129, 0.5)'
                }}>
                  {createdEvent.access_code}
                </div>
                <small style={{ color: 'rgba(255, 255, 255, 0.7)', display: 'block', marginTop: '0.5rem' }}>
                  Comparte este código con los asistentes para que puedan unirse a tu evento
                </small>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button 
                  className="btn btn-secondary"
                  onClick={() => navigator.clipboard.writeText(createdEvent.access_code)}
                >
                  <span className="material-icons">content_copy</span>
                  Copiar Código
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setShowSuccessModal(false)
                    navigate(`/admin/${createdEvent.id}`)
                  }}
                >
                  <span className="material-icons">settings</span>
                  Gestionar Evento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DashboardLayout 
        title="Panel de Control" 
        subtitle="Gestiona tus eventos y modera las preguntas en tiempo real"
      >
        <div className="card">
          
          <button 
            className="btn btn-primary"
            onClick={showCreateForm ? handleCancelCreate : handleCreateEventClick}
          >
            {showCreateForm ? 'Cancelar' : 'Crear Nuevo Evento'}
          </button>

        {showCreateForm && (
          <div style={{ marginTop: '2rem' }}>
            {selectedEventType && (
              <div className="selected-event-type">
                <div className="event-type-indicator">
                  <span className="material-icons" style={{ color: selectedEventType.color }}>
                    {selectedEventType.icon}
                  </span>
                  <span>Tipo: <strong>{selectedEventType.name}</strong></span>
                </div>
              </div>
            )}
            
            <form onSubmit={handleCreateEvent}>
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
              <label>Código de Acceso para Asistentes (opcional)</label>
              <input
                type="text"
                value={newEvent.access_code}
                onChange={(e) => setNewEvent({ ...newEvent, access_code: e.target.value })}
                placeholder="Dejar vacío para generar automáticamente"
              />
              <small style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                Los asistentes usarán este código para unirse a tu evento
              </small>
            </div>
            
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <span className="material-icons" style={{ animation: 'spin 1s linear infinite' }}>hourglass_empty</span>
                    Creando Evento...
                  </>
                ) : (
                  'Crear Evento'
                )}
              </button>
            </form>
          </div>
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
                  <p>
                    <span className="material-icons" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '0.25rem', color: '#8338ec' }}>
                      key
                    </span>
                    Código para asistentes: <strong style={{ color: '#8338ec' }}>{event.access_code}</strong>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
    </>
  )
}

export default EventDashboard