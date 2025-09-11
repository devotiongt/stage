import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import '../pages/LandingPage.css'

function AdminPanel() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [adminCode, setAdminCode] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const savedCode = localStorage.getItem(`admin-${eventId}`)
    if (savedCode) {
      setAdminCode(savedCode)
      verifyAndFetch(savedCode)
    } else {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    if (!isAuthenticated) return
    
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
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [eventId, isAuthenticated])

  const verifyAndFetch = async (code) => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('admin_code', code)
      .single()
    
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
    const { error } = await supabase
      .from('events')
      .update({ status: newStatus })
      .eq('id', eventId)
    
    if (error) {
      console.error('Error updating event:', error)
    } else {
      setEvent({ ...event, status: newStatus })
    }
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
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '2rem' }}>
            Ingresa el código de administrador para acceder
          </p>
          
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
            
            <button type="submit" className="btn btn-primary">
              Acceder
            </button>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h1>{event.name} - Panel Admin</h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Código de acceso: <strong style={{ color: '#8338ec' }}>{event.access_code}</strong>
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn btn-secondary"
              onClick={() => navigate(`/event/${eventId}`)}
            >
              Ver como Audiencia
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => {
                localStorage.removeItem(`admin-${eventId}`)
                navigate('/')
              }}
            >
              Salir
            </button>
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
              <div 
                key={question.id} 
                className={`question-card ${question.is_answered ? 'answered' : ''} ${question.is_featured ? 'featured' : ''}`}
              >
                <div className="question-header">
                  <span className="question-author">{question.author_name}</span>
                  <span className="question-time">
                    {new Date(question.created_at).toLocaleTimeString()}
                  </span>
                </div>
                
                <p className="question-content">{question.content}</p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span className="vote-count">
                    {question.votes} votos
                  </span>
                  
                  <div className="question-actions">
                    <button 
                      className={`btn ${question.is_featured ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => toggleFeatured(question.id, question.is_featured)}
                    >
                      <span className="material-icons" style={{ fontSize: '1rem', marginRight: '0.25rem', verticalAlign: 'middle' }}>
                        {question.is_featured ? 'star' : 'star_outline'}
                      </span>
                      {question.is_featured ? 'Destacada' : 'Destacar'}
                    </button>
                    <button 
                      className={`btn ${question.is_answered ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => toggleAnswered(question.id, question.is_answered)}
                    >
                      <span className="material-icons" style={{ fontSize: '1rem', marginRight: '0.25rem', verticalAlign: 'middle' }}>
                        {question.is_answered ? 'check_circle' : 'check_circle_outline'}
                      </span>
                      {question.is_answered ? 'Respondida' : 'Marcar Respondida'}
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => deleteQuestion(question.id)}
                    >
                      Eliminar
                    </button>
                  </div>
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

export default AdminPanel