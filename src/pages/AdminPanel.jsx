import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import PollManager from '../components/PollManager'
import '../pages/LandingPage.css'

function AdminPanel() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { user, permissions } = useAuth()
  const [event, setEvent] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [adminCode, setAdminCode] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [presentationDisplay, setPresentationDisplay] = useState(null)
  const [showCustomMessageModal, setShowCustomMessageModal] = useState(false)
  const [customMessage, setCustomMessage] = useState('')
  const [copyFeedback, setCopyFeedback] = useState('')
  const [hasActivePoll, setHasActivePoll] = useState(false)

  useEffect(() => {
    // Si el usuario está autenticado y puede administrar eventos, verificar si puede acceder directamente
    if (user && permissions?.canAccessDashboard) {
      verifyAuthenticatedAccess()
    } else {
      // Si no está autenticado, verificar código guardado
      const savedCode = localStorage.getItem(`admin-${eventId}`)
      if (savedCode) {
        setAdminCode(savedCode)
        verifyAndFetch(savedCode)
      } else {
        setLoading(false)
      }
    }
  }, [eventId, user, permissions])

  useEffect(() => {
    if (!isAuthenticated) return
    
    // Verificar si hay encuesta activa
    const checkActivePoll = async () => {
      const { data, error } = await supabase
        .from('polls')
        .select('id')
        .eq('event_id', eventId)
        .eq('status', 'active')
        .single()
      
      setHasActivePoll(!!data && !error)
    }
    
    checkActivePoll()
    
    const subscription = supabase
      .channel(`admin-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'questions',
          filter: `event_id=eq.${eventId}`
        },
        () => {
          fetchQuestions()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'polls',
          filter: `event_id=eq.${eventId}`
        },
        () => {
          checkActivePoll()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [eventId, isAuthenticated])

  const verifyAuthenticatedAccess = async () => {
    try {
      // Función para verificar si es un UUID válido
      const isValidUUID = (str) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        return uuidRegex.test(str)
      }
      
      let data = null
      let error = null
      
      if (isValidUUID(eventId)) {
        // Si es UUID, buscar por ID
        const result = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single()
        
        data = result.data
        error = result.error
      } else {
        // Si no es UUID, buscar por access_code
        const result = await supabase
          .from('events')
          .select('*')
          .eq('access_code', eventId.toUpperCase())
          .single()
        
        data = result.data
        error = result.error
      }
      
      if (error || !data) {
        console.error('Event not found:', error)
        setLoading(false)
        return
      }

      // Si el usuario es super_admin o admin, permitir acceso directo
      if (permissions?.canManageUsers) {
        setEvent(data)
        setIsAuthenticated(true)
        fetchQuestions()
        setLoading(false)
        return
      }

      // Si no tiene permisos especiales, verificar código como antes
      const savedCode = localStorage.getItem(`admin-${eventId}`)
      if (savedCode) {
        setAdminCode(savedCode)
        verifyAndFetch(savedCode)
      } else {
        setLoading(false)
      }
    } catch (err) {
      console.error('Error verifying access:', err)
      setLoading(false)
    }
  }

  const verifyAndFetch = async (code) => {
    // Función para verificar si es un UUID válido
    const isValidUUID = (str) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      return uuidRegex.test(str)
    }
    
    let data = null
    let error = null
    
    if (isValidUUID(eventId)) {
      // Si es UUID, buscar por ID
      const result = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('admin_code', code)
        .single()
      
      data = result.data
      error = result.error
    } else {
      // Si no es UUID, buscar por access_code
      const result = await supabase
        .from('events')
        .select('*')
        .eq('access_code', eventId.toUpperCase())
        .eq('admin_code', code)
        .single()
      
      data = result.data
      error = result.error
    }
    
    if (error || !data) {
      setIsAuthenticated(false)
      localStorage.removeItem(`admin-${eventId}`)
    } else {
      setEvent(data)
      setIsAuthenticated(true)
      localStorage.setItem(`admin-${eventId}`, code)
      fetchQuestions()
    }
    setLoading(false)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    await verifyAndFetch(adminCode)
  }

  const fetchQuestions = async () => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('event_id', eventId)
      .order('is_featured', { ascending: false })
      .order('votes', { ascending: false })
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching questions:', error)
    } else {
      setQuestions(data || [])
    }
  }

  const toggleAnswered = async (questionId, currentStatus) => {
    const { error } = await supabase
      .from('questions')
      .update({ is_answered: !currentStatus })
      .eq('id', questionId)
    
    if (error) {
      console.error('Error updating question:', error)
    } else {
      fetchQuestions()
    }
  }

  const toggleFeatured = async (questionId, currentStatus) => {
    const { error } = await supabase
      .from('questions')
      .update({ is_featured: !currentStatus })
      .eq('id', questionId)
    
    if (error) {
      console.error('Error updating question:', error)
    } else {
      fetchQuestions()
    }
  }

  const deleteQuestion = async (questionId) => {
    if (!confirm('¿Estás seguro de eliminar esta pregunta?')) return
    
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionId)
    
    if (error) {
      console.error('Error deleting question:', error)
    } else {
      fetchQuestions()
    }
  }

  const updateEventStatus = async (newStatus) => {
    // Usar el ID real del evento (si se accedió por código, usar event.id)
    const currentEventId = event?.id || eventId
    const { error } = await supabase
      .from('events')
      .update({ status: newStatus })
      .eq('id', currentEventId)
    
    if (error) {
      console.error('Error updating event:', error)
    } else {
      setEvent({ ...event, status: newStatus })
    }
  }

  // Funciones para controlar la pantalla de presentación
  const updatePresentationDisplay = async (displayType, questionId = null, customMessage = null, pollId = null) => {
    try {
      // Actualizar en la base de datos
      console.log('⚠️ Using direct table update for poll display')
      // Usar actualización directa para soportar poll_id
      const result = await updatePresentationDisplayDirect(displayType, questionId, customMessage, pollId)
      setPresentationDisplay(result)
      console.log('✅ Presentation display updated:', result)

      // Enviar broadcast para notificar cambios inmediatamente
      const broadcastPayload = {
        event_id: eventId,
        display_type: displayType,
        question_id: questionId,
        custom_message: customMessage,
        poll_id: pollId,
        timestamp: new Date().toISOString()
      }

      const channel = supabase.channel(`presentation-${eventId}`)
      await channel.send({
        type: 'broadcast',
        event: 'presentation_update',
        payload: broadcastPayload
      })
      
      console.log('📡 Broadcast sent:', broadcastPayload)

    } catch (error) {
      console.error('Error:', error)
      alert('Error inesperado al actualizar la pantalla')
    }
  }

  // Función de respaldo para actualizar directamente en la tabla
  const updatePresentationDisplayDirect = async (displayType, questionId = null, customMessage = null, pollId = null) => {
    // Desactivar display actual
    await supabase
      .from('presentation_display')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('event_id', eventId)
      .eq('is_active', true)

    // Crear nuevo display
    const { data, error } = await supabase
      .from('presentation_display')
      .insert({
        event_id: eventId,
        display_type: displayType,
        question_id: questionId,
        custom_message: customMessage,
        poll_id: pollId,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error with direct table update:', error)
      throw error
    }

    return data
  }

  const showWelcomeScreen = () => updatePresentationDisplay('welcome')
  const showQRCode = () => updatePresentationDisplay('qr_code')
  const showQuestionOnScreen = (questionId) => updatePresentationDisplay('question', questionId)
  const showActivePoll = () => updatePresentationDisplay('active_poll')
  const showPollResults = (pollId) => updatePresentationDisplay('poll_results', null, null, pollId)
  
  const handleCustomMessageClick = () => {
    setCustomMessage('')
    setShowCustomMessageModal(true)
  }

  const handleCustomMessageSubmit = (e) => {
    e.preventDefault()
    if (customMessage.trim()) {
      updatePresentationDisplay('custom_message', null, customMessage.trim())
      setShowCustomMessageModal(false)
      setCustomMessage('')
    }
  }

  const handleCustomMessageCancel = () => {
    setShowCustomMessageModal(false)
    setCustomMessage('')
  }

  // Funciones para copiar enlaces
  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedback(`${type} copiado!`)
      setTimeout(() => setCopyFeedback(''), 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      setCopyFeedback('Error al copiar')
      setTimeout(() => setCopyFeedback(''), 2000)
    }
  }

  const copyEventCode = () => {
    copyToClipboard(event.access_code, 'Código')
  }

  const copyEventLink = () => {
    // Usar el código de acceso en lugar del ID para un enlace más simple
    const eventUrl = `${window.location.origin}/stage/event/${event.access_code}`
    copyToClipboard(eventUrl, 'Enlace')
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-inner" style={{ paddingTop: '2rem' }}>
          <div className="card">
            <p>Cargando...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="dashboard-container">
        <nav className="navbar">
          <div className="nav-container">
            <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
              <span className="material-icons logo-icon">theater_comedy</span>
              <span className="logo-text">Stage</span>
            </div>
            <div className="nav-links">
              <button className="btn btn-secondary" onClick={() => navigate('/')}>
                Inicio
              </button>
            </div>
          </div>
        </nav>
        
        <div className="dashboard-inner" style={{ paddingTop: '5rem' }}>
        <div className="card">
          <h2>Panel de Administración</h2>
          {user ? (
            <div>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1rem' }}>
                Tu cuenta no tiene permisos de administración para este evento.
              </p>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '2rem' }}>
                Si tienes el código de administrador del evento, puedes ingresarlo aquí:
              </p>
            </div>
          ) : (
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '2rem' }}>
              Ingresa el código de administrador para acceder a este evento
            </p>
          )}
          
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>Código de Administrador</label>
              <input
                type="text"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                required
                placeholder="Ingresa el código"
              />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">
                Acceder con Código
              </button>
              {user && (
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => navigate('/dashboard')}
                >
                  Ir a Mi Dashboard
                </button>
              )}
            </div>
          </form>
        </div>
        </div>
      </div>
    )
  }

  const stats = {
    total: questions.length,
    answered: questions.filter(q => q.is_answered).length,
    featured: questions.filter(q => q.is_featured).length,
    pending: questions.filter(q => !q.is_answered).length
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
            <span className="event-status active" style={{ marginRight: '1rem' }}>
              <span className="pulse-dot"></span>
              {event.status === 'active' ? 'EN VIVO' : event.status}
            </span>
            <button className="btn btn-secondary" onClick={() => navigate(`/event/${eventId}`)}>
              Vista Pública
            </button>
          </div>
        </div>
      </nav>
      
      <div className="dashboard-inner" style={{ paddingTop: '5rem' }}>
      <div className="card">
        {/* Header del evento */}
        <div style={{ marginBottom: '2rem' }}>
          <h1>{event.name}</h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: '0.5rem 0 0 0' }}>
            Panel de administración del evento
          </p>
        </div>

        {/* Información y herramientas principales */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '2rem', 
          marginBottom: '2rem' 
        }}>
          
          {/* Información del evento */}
          <div style={{
            background: 'rgba(131, 56, 236, 0.1)',
            border: '1px solid rgba(131, 56, 236, 0.3)',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-icons">info</span>
              Información del Evento
            </h3>
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>
                Código de acceso para participantes:
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <code style={{
                  background: 'rgba(131, 56, 236, 0.2)',
                  color: '#8338ec',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  fontFamily: 'monospace'
                }}>
                  {event.access_code}
                </code>
                <button 
                  className="btn btn-sm btn-secondary"
                  onClick={copyEventCode}
                  title="Copiar código"
                >
                  <span className="material-icons">content_copy</span>
                </button>
              </div>
            </div>
            
            <div>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>
                Enlace directo:
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button 
                  className="btn btn-sm btn-secondary"
                  onClick={copyEventLink}
                  style={{ flex: 1, justifyContent: 'flex-start' }}
                >
                  <span className="material-icons" style={{ marginRight: '0.5rem' }}>link</span>
                  Copiar enlace del evento
                </button>
              </div>
            </div>

            {copyFeedback && (
              <div style={{ 
                marginTop: '1rem',
                color: '#10b981', 
                fontSize: '0.85rem', 
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '0.5rem',
                borderRadius: '6px'
              }}>
                <span className="material-icons" style={{ fontSize: '1rem' }}>check_circle</span>
                {copyFeedback}
              </div>
            )}
          </div>

          {/* Acciones principales */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-icons">settings</span>
              Acciones Rápidas
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                className="btn btn-primary"
                onClick={() => window.open(`/stage/presentation/${eventId}`, '_blank', 'fullscreen=yes')}
                style={{ 
                  background: 'linear-gradient(135deg, #ff006e, #8338ec)',
                  justifyContent: 'flex-start'
                }}
              >
                <span className="material-icons" style={{ marginRight: '0.5rem' }}>present_to_all</span>
                Abrir Pantalla de Presentación
              </button>
              
              <button 
                className="btn btn-secondary"
                onClick={() => navigate(`/event/${eventId}`)}
                style={{ justifyContent: 'flex-start' }}
              >
                <span className="material-icons" style={{ marginRight: '0.5rem' }}>visibility</span>
                Ver como Audiencia
              </button>

              <button 
                className="btn btn-secondary"
                onClick={() => {
                  localStorage.removeItem(`admin-${eventId}`)
                  navigate('/')
                }}
                style={{ justifyContent: 'flex-start' }}
              >
                <span className="material-icons" style={{ marginRight: '0.5rem' }}>logout</span>
                Salir del Panel
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${event.status === 'active' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => updateEventStatus('active')}
          >
            Activo
          </button>
          <button 
            className={`btn ${event.status === 'paused' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => updateEventStatus('paused')}
          >
            Pausado
          </button>
          <button 
            className={`btn ${event.status === 'ended' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => updateEventStatus('ended')}
          >
            Finalizado
          </button>
        </div>
      </div>

      {/* Controles de Pantalla de Presentación */}
      <div className="card">
        <h2>
          <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: '0.5rem' }}>
            present_to_all
          </span>
          Controles de Pantalla de Presentación
        </h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '2rem' }}>
          Controla qué se muestra en la pantalla de presentación en tiempo real
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <button 
            className="btn btn-secondary"
            onClick={showWelcomeScreen}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span className="material-icons">home</span>
            Pantalla de Bienvenida
          </button>
          <button 
            className="btn btn-secondary"
            onClick={showQRCode}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span className="material-icons">qr_code</span>
            Mostrar Código QR
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleCustomMessageClick}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span className="material-icons">message</span>
            Mensaje Personalizado
          </button>
          {hasActivePoll && (
            <button 
              className="btn btn-primary"
              onClick={showActivePoll}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                background: 'linear-gradient(135deg, #8338ec, #3a86ff)'
              }}
            >
              <span className="material-icons">bar_chart</span>
              Mostrar Resultados de Encuesta
            </button>
          )}
        </div>

        <div style={{ 
          background: 'rgba(131, 56, 236, 0.1)', 
          border: '1px solid rgba(131, 56, 236, 0.3)', 
          borderRadius: '12px', 
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span className="material-icons" style={{ color: '#8338ec' }}>info</span>
            <strong style={{ color: '#ffffff' }}>Instrucciones:</strong>
          </div>
          <ul style={{ color: 'rgba(255, 255, 255, 0.8)', margin: '0', paddingLeft: '1.5rem' }}>
            <li>Usa los botones de arriba para controlar qué se muestra en la pantalla</li>
            <li>En las preguntas, usa el botón "Mostrar en Pantalla" para destacar una pregunta específica</li>
            <li>La pantalla se actualiza automáticamente en tiempo real</li>
          </ul>
        </div>
      </div>

      {/* Gestión de Encuestas */}
      <PollManager eventId={event?.id} onShowPollResults={showPollResults} />

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Preguntas Totales</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.pending}</div>
          <div className="stat-label">Pendientes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.answered}</div>
          <div className="stat-label">Respondidas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.featured}</div>
          <div className="stat-label">Destacadas</div>
        </div>
      </div>

      <div className="card">
        <h2>Gestión de Preguntas</h2>
        
        {questions.length === 0 ? (
          <div className="empty-state">
            <p>No hay preguntas aún</p>
          </div>
        ) : (
          <div className="question-list">
            {questions.map((question) => (
              <div key={question.id} className="question-row">
                <div className="question-content">
                  <h4>{question.content}</h4>
                  <div className="question-info">
                    <span className="author">{question.author_name}</span>
                    <span className="time">{new Date(question.created_at).toLocaleString('es-ES', { 
                      day: 'numeric', 
                      month: 'short', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}</span>
                    <span className="votes">{question.votes} votos</span>
                    {question.is_featured && <span className="status featured">⭐ Destacada</span>}
                    {question.is_answered && <span className="status answered">✅ Respondida</span>}
                  </div>
                </div>
                
                <div className="question-actions">
                  <button 
                    className={`btn btn-sm ${question.is_featured ? 'btn-warning' : 'btn-outline'}`}
                    onClick={() => toggleFeatured(question.id, question.is_featured)}
                  >
                    {question.is_featured ? 'Quitar destacado' : 'Destacar'}
                  </button>
                  <button 
                    className={`btn btn-sm ${question.is_answered ? 'btn-success' : 'btn-outline'}`}
                    onClick={() => toggleAnswered(question.id, question.is_answered)}
                  >
                    {question.is_answered ? 'Respondida' : 'Marcar respondida'}
                  </button>
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => showQuestionOnScreen(question.id)}
                  >
                    Mostrar
                  </button>
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={() => deleteQuestion(question.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      {/* Modal de Mensaje Personalizado */}
      {showCustomMessageModal && (
        <div className="modal-overlay" onClick={handleCustomMessageCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: '0.5rem' }}>
                  message
                </span>
                Mensaje Personalizado
              </h2>
              <button 
                className="modal-close"
                onClick={handleCustomMessageCancel}
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            
            <form onSubmit={handleCustomMessageSubmit}>
              <div className="input-group">
                <label htmlFor="customMessage">
                  Mensaje para mostrar en pantalla
                </label>
                <textarea
                  id="customMessage"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Escribe tu mensaje aquí..."
                  rows="4"
                  required
                  style={{ resize: 'vertical', minHeight: '100px' }}
                />
                <small style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem', marginTop: '0.5rem', display: 'block' }}>
                  Este mensaje aparecerá centrado en la pantalla de presentación
                </small>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handleCustomMessageCancel}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={!customMessage.trim()}
                >
                  <span className="material-icons" style={{ marginRight: '0.5rem' }}>send</span>
                  Mostrar Mensaje
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPanel