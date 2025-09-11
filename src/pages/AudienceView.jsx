import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import '../pages/LandingPage.css'

function AudienceView() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [questions, setQuestions] = useState([])
  const [newQuestion, setNewQuestion] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEvent()
    fetchQuestions()
    
    const subscription = supabase
      .channel(`event-${eventId}`)
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
  }, [eventId])

  const fetchEvent = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()
    
    if (error) {
      console.error('Error fetching event:', error)
    } else {
      setEvent(data)
    }
    setLoading(false)
  }

  const fetchQuestions = async () => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('event_id', eventId)
      .order('votes', { ascending: false })
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching questions:', error)
    } else {
      setQuestions(data || [])
    }
  }

  const handleSubmitQuestion = async (e) => {
    e.preventDefault()
    
    if (!newQuestion.trim()) return
    
    const { error } = await supabase
      .from('questions')
      .insert({
        event_id: eventId,
        content: newQuestion,
        author_name: authorName || 'Anónimo',
        votes: 0,
        is_answered: false,
        is_featured: false
      })
    
    if (error) {
      console.error('Error submitting question:', error)
      alert('Error al enviar la pregunta')
    } else {
      setNewQuestion('')
      setAuthorName('')
      fetchQuestions()
    }
  }

  const handleVote = async (questionId, currentVotes) => {
    const { error } = await supabase
      .from('questions')
      .update({ votes: currentVotes + 1 })
      .eq('id', questionId)
    
    if (error) {
      console.error('Error voting:', error)
    } else {
      fetchQuestions()
    }
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-inner" style={{ paddingTop: '2rem' }}>
          <div className="card">
            <p>Cargando evento...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-inner" style={{ paddingTop: '2rem' }}>
          <div className="card">
            <h2>Evento no encontrado</h2>
            <p>El evento que buscas no existe o ha sido eliminado.</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    )
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
            <span style={{ color: 'rgba(255, 255, 255, 0.5)', marginRight: '1rem' }}>Código: <strong style={{ color: '#8338ec' }}>{event.access_code}</strong></span>
            <button className="btn btn-secondary" onClick={() => navigate('/')}>
              Salir
            </button>
          </div>
        </div>
      </nav>
      
      <div className="dashboard-inner" style={{ paddingTop: '5rem' }}>
      <div className="card">
        <h1>{event.name}</h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '2rem' }}>
          {event.description}
        </p>

        <form onSubmit={handleSubmitQuestion}>
          <div className="input-group">
            <label>Tu nombre (opcional)</label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Anónimo"
            />
          </div>
          
          <div className="input-group">
            <label>Tu pregunta</label>
            <textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              rows="3"
              required
              placeholder="Escribe tu pregunta aquí..."
            />
          </div>
          
          <button type="submit" className="btn btn-primary">
            Enviar Pregunta
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Preguntas ({questions.length})</h2>
        
        {questions.length === 0 ? (
          <div className="empty-state">
            <p>Aún no hay preguntas. ¡Sé el primero en preguntar!</p>
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
                
                <div className="question-actions">
                  <button 
                    className="btn btn-secondary"
                    onClick={() => handleVote(question.id, question.votes)}
                    disabled={question.is_answered}
                  >
                    <span className="material-icons" style={{ fontSize: '1rem', marginRight: '0.25rem' }}>thumb_up</span>
                    Votar
                  </button>
                  <span className="vote-count">
                    {question.votes} votos
                  </span>
                  {question.is_featured && (
                    <span style={{ color: '#f59e0b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span className="material-icons" style={{ fontSize: '1rem' }}>star</span>
                      Destacada
                    </span>
                  )}
                  {question.is_answered && (
                    <span style={{ color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span className="material-icons" style={{ fontSize: '1rem' }}>check_circle</span>
                      Respondida
                    </span>
                  )}
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

export default AudienceView