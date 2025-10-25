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
  const [votedQuestions, setVotedQuestions] = useState(new Set())
  const [realEventId, setRealEventId] = useState(null)
  const [activePoll, setActivePoll] = useState(null)
  const [pollResponses, setPollResponses] = useState({})
  const [submittingPoll, setSubmittingPoll] = useState(false)

  // Cargar votos guardados desde localStorage cuando tengamos el ID real
  useEffect(() => {
    if (!realEventId) return
    
    const savedVotes = localStorage.getItem(`voted-questions-${realEventId}`)
    if (savedVotes) {
      setVotedQuestions(new Set(JSON.parse(savedVotes)))
    }
  }, [realEventId])

  useEffect(() => {
    fetchEvent()
  }, [eventId])

  // Suscripción de tiempo real separada que depende del realEventId
  useEffect(() => {
    if (!realEventId) return

    fetchQuestions()
    fetchActivePoll()
    
    console.log('🔌 Configurando suscripciones WebSocket para evento:', realEventId)

    // Suscripción UNIFICADA - usar un solo canal para todo
    const subscription = supabase
      .channel(`event-${realEventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'questions',
          filter: `event_id=eq.${realEventId}`
        },
        () => {
          console.log('📝 Question change detected')
          fetchQuestions()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'polls',
          filter: `event_id=eq.${realEventId}`
        },
        (payload) => {
          console.log('📊 Poll change detected in audience view:', payload)
          fetchActivePoll()
        }
      )
      .on('broadcast', { event: 'poll_launched' }, (payload) => {
        console.log('📊 Poll launched broadcast received in audience view:', payload)
        fetchActivePoll()
      })
      .on('broadcast', { event: 'poll_ended' }, (payload) => {
        console.log('📊 Poll ended broadcast received in audience view:', payload)
        fetchActivePoll()
      })
      .subscribe((status, err) => {
        console.log(`🔌 Audience subscription status: ${status}`, err ? `Error: ${err}` : '')
        if (status === 'SUBSCRIBED') {
          console.log('✅ Audience WebSocket connection established - listening for questions and polls')
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.log('❌ Audience WebSocket connection failed')
        }
      })

    return () => {
      console.log('🧹 Cleaning up audience subscriptions')
      subscription.unsubscribe()
    }
  }, [realEventId, eventId])

  const fetchEvent = async () => {
    console.log('🔍 Buscando evento con ID/código:', eventId)
    
    // Función para verificar si es un UUID válido
    const isValidUUID = (str) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      return uuidRegex.test(str)
    }
    
    let data = null
    let error = null
    
    // Si parece un UUID, buscar por ID
    if (isValidUUID(eventId)) {
      console.log('📊 Buscando por UUID...')
      const result = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()
      
      data = result.data
      error = result.error
    } else {
      // Si no es UUID, buscar por access_code
      console.log('🔄 Buscando por código de acceso:', eventId.toUpperCase())
      const result = await supabase
        .from('events')
        .select('*')
        .eq('access_code', eventId.toUpperCase())
        .single()
      
      data = result.data
      error = result.error
      console.log('📊 Resultado búsqueda por código:', { data, error })
    }
    
    if (error) {
      console.error('❌ Error fetching event:', error)
      // Vamos a listar algunos eventos para debug
      const { data: allEvents } = await supabase
        .from('events')
        .select('id, name, access_code')
        .limit(5)
      console.log('📋 Eventos disponibles:', allEvents)
    } else {
      console.log('✅ Evento encontrado:', data)
      setEvent(data)
      setRealEventId(data.id) // Guardar el ID real del evento
    }
    setLoading(false)
  }

  const fetchQuestions = async () => {
    const currentEventId = realEventId || eventId
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('event_id', currentEventId)
      .order('votes', { ascending: false })
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching questions:', error)
    } else {
      setQuestions(data || [])
    }
  }

  const fetchActivePoll = async () => {
    try {
      const currentEventId = realEventId || eventId
      console.log('🔍 Buscando encuesta activa para evento:', currentEventId)
      
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .select(`
          *,
          poll_questions (
            *,
            poll_options (*)
          )
        `)
        .eq('event_id', currentEventId)
        .eq('status', 'active')
        .single()

      if (pollError) {
        if (pollError.code === 'PGRST116') {
          console.log('📊 No hay encuestas activas')
        } else if (pollError.code === '42P01') {
          console.warn('⚠️ Tabla polls no existe - necesitas ejecutar polls_schema.sql')
        } else {
          console.error('❌ Error fetching active poll:', pollError)
        }
        setActivePoll(null)
        return
      }

      console.log('📊 Encuesta activa encontrada:', pollData ? `"${pollData.title}"` : 'Ninguna')
      setActivePoll(pollData || null)
      
      // Si hay encuesta activa, inicializar respuestas vacías
      if (pollData && !pollResponses[pollData.id]) {
        console.log('🔧 Inicializando respuestas para encuesta:', pollData.id)
        const initialResponses = {}
        pollData.poll_questions.forEach(question => {
          initialResponses[question.id] = question.question_type === 'multiple_choice' ? [] : ''
        })
        setPollResponses(prev => ({
          ...prev,
          [pollData.id]: initialResponses
        }))
      }

    } catch (error) {
      console.error('❌ Error fetching active poll:', error)
    }
  }

  const handlePollResponse = (questionId, value, isMultiple = false) => {
    if (!activePoll) return

    setPollResponses(prev => {
      const pollId = activePoll.id
      const currentPollResponses = prev[pollId] || {}
      
      if (isMultiple) {
        // Para selección múltiple
        const currentValues = Array.isArray(currentPollResponses[questionId]) ? 
          [...currentPollResponses[questionId]] : []
        
        if (currentValues.includes(value)) {
          // Remover si ya está seleccionado
          const newValues = currentValues.filter(v => v !== value)
          return {
            ...prev,
            [pollId]: {
              ...currentPollResponses,
              [questionId]: newValues
            }
          }
        } else {
          // Agregar nuevo valor
          return {
            ...prev,
            [pollId]: {
              ...currentPollResponses,
              [questionId]: [...currentValues, value]
            }
          }
        }
      } else {
        // Para selección única o texto
        return {
          ...prev,
          [pollId]: {
            ...currentPollResponses,
            [questionId]: value
          }
        }
      }
    })
  }

  const submitPollResponses = async () => {
    if (!activePoll || submittingPoll) return

    const userIdentifier = `${realEventId || eventId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const responses = pollResponses[activePoll.id] || {}

    setSubmittingPoll(true)

    try {
      const responsePromises = []

      for (const question of activePoll.poll_questions) {
        const response = responses[question.id]
        
        if (question.is_required && (!response || (Array.isArray(response) && response.length === 0))) {
          alert(`La pregunta "${question.question_text}" es obligatoria`)
          setSubmittingPoll(false)
          return
        }

        if (response) {
          if (question.question_type === 'multiple_choice' && Array.isArray(response)) {
            // Múltiples respuestas para selección múltiple
            for (const optionId of response) {
              responsePromises.push(
                supabase.from('poll_responses').insert({
                  poll_id: activePoll.id,
                  question_id: question.id,
                  option_id: optionId,
                  user_identifier: userIdentifier
                })
              )
            }
          } else if (question.question_type === 'single_choice') {
            // Una sola opción para selección única
            responsePromises.push(
              supabase.from('poll_responses').insert({
                poll_id: activePoll.id,
                question_id: question.id,
                option_id: response,
                user_identifier: userIdentifier
              })
            )
          } else if (question.question_type === 'text') {
            // Respuesta de texto
            responsePromises.push(
              supabase.from('poll_responses').insert({
                poll_id: activePoll.id,
                question_id: question.id,
                response_text: response,
                user_identifier: userIdentifier
              })
            )
          }
        }
      }

      await Promise.all(responsePromises)
      
      // Marcar como enviado
      setPollResponses(prev => ({
        ...prev,
        [`${activePoll.id}_submitted`]: true
      }))

      alert('¡Gracias por responder la encuesta!')

    } catch (error) {
      console.error('Error submitting poll responses:', error)
      alert('Error al enviar las respuestas. Por favor intenta de nuevo.')
    } finally {
      setSubmittingPoll(false)
    }
  }

  const hasSubmittedPoll = () => {
    return activePoll && pollResponses[`${activePoll.id}_submitted`]
  }

  const handleSubmitQuestion = async (e) => {
    e.preventDefault()
    
    if (!newQuestion.trim()) return
    
    const currentEventId = realEventId || eventId
    const { error } = await supabase
      .from('questions')
      .insert({
        event_id: currentEventId,
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
    // Verificar si ya votó por esta pregunta
    if (votedQuestions.has(questionId)) {
      return
    }

    const { error } = await supabase
      .from('questions')
      .update({ votes: currentVotes + 1 })
      .eq('id', questionId)
    
    if (error) {
      console.error('Error voting:', error)
    } else {
      // Marcar como votado y guardar en localStorage
      const newVotedQuestions = new Set(votedQuestions)
      newVotedQuestions.add(questionId)
      setVotedQuestions(newVotedQuestions)
      
      // Guardar en localStorage para persistencia (usar ID real)
      const currentEventId = realEventId || eventId
      localStorage.setItem(`voted-questions-${currentEventId}`, JSON.stringify([...newVotedQuestions]))
      
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

  // Si hay una encuesta activa, mostrar la interfaz de encuesta
  if (activePoll && !loading) {
    return (
      <div className="dashboard-container">
        <nav className="navbar">
          <div className="nav-container">
            <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
              <span className="material-icons logo-icon">theater_comedy</span>
              <span className="logo-text">Stage</span>
            </div>
            <div className="nav-links">
              <span style={{ color: 'rgba(255, 255, 255, 0.5)', marginRight: '1rem' }}>
                <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: '0.25rem', color: '#10b981' }}>
                  poll
                </span>
                Encuesta en Vivo
              </span>
              <button className="btn btn-secondary" onClick={() => navigate('/')}>
                Salir
              </button>
            </div>
          </div>
        </nav>
        
        <div className="dashboard-inner" style={{ paddingTop: '5rem' }}>
          <div className="card">
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h1 style={{ 
                margin: '0 0 1rem 0',
                background: 'linear-gradient(135deg, #8338ec, #3a86ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                {activePoll.title}
              </h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.1rem' }}>
                {event.name}
              </p>
              {hasSubmittedPoll() && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '12px',
                  padding: '1rem',
                  margin: '1rem 0',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}>
                  <span className="material-icons">check_circle</span>
                  ¡Gracias por responder! Tu participación ha sido registrada.
                </div>
              )}
            </div>

            {!hasSubmittedPoll() ? (
              <div>
                {activePoll.poll_questions?.map((question, index) => (
                  <div key={question.id} style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '2rem',
                    marginBottom: '2rem'
                  }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ 
                        margin: '0 0 0.5rem 0', 
                        color: '#ffffff',
                        fontSize: '1.25rem',
                        fontWeight: '500'
                      }}>
                        {index + 1}. {question.question_text}
                        {question.is_required && (
                          <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>
                        )}
                      </h3>
                      <p style={{ 
                        margin: 0, 
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '0.9rem'
                      }}>
                        {question.question_type === 'single_choice' && 'Selecciona una opción'}
                        {question.question_type === 'multiple_choice' && 'Puedes seleccionar múltiples opciones'}
                        {question.question_type === 'text' && 'Escribe tu respuesta'}
                      </p>
                    </div>

                    {question.question_type === 'text' ? (
                      <textarea
                        value={pollResponses[activePoll.id]?.[question.id] || ''}
                        onChange={(e) => handlePollResponse(question.id, e.target.value)}
                        placeholder="Escribe tu respuesta aquí..."
                        rows="4"
                        style={{
                          width: '100%',
                          padding: '1rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: '#ffffff',
                          resize: 'vertical'
                        }}
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {question.poll_options?.map((option) => {
                          const isSelected = question.question_type === 'multiple_choice' 
                            ? pollResponses[activePoll.id]?.[question.id]?.includes(option.id)
                            : pollResponses[activePoll.id]?.[question.id] === option.id

                          return (
                            <label
                              key={option.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '1rem',
                                background: isSelected 
                                  ? 'rgba(131, 56, 236, 0.15)' 
                                  : 'rgba(255, 255, 255, 0.05)',
                                border: `1px solid ${isSelected 
                                  ? 'rgba(131, 56, 236, 0.5)' 
                                  : 'rgba(255, 255, 255, 0.1)'}`,
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                color: '#ffffff'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.target.style.background = 'rgba(255, 255, 255, 0.08)'
                                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                                }
                              }}
                            >
                              <input
                                type={question.question_type === 'multiple_choice' ? 'checkbox' : 'radio'}
                                name={`question_${question.id}`}
                                checked={isSelected}
                                onChange={() => handlePollResponse(
                                  question.id, 
                                  option.id, 
                                  question.question_type === 'multiple_choice'
                                )}
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  accentColor: '#8338ec'
                                }}
                              />
                              <span style={{ flex: 1, fontSize: '1rem' }}>
                                {option.option_text}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}

                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                  <button 
                    className="btn btn-primary"
                    onClick={submitPollResponses}
                    disabled={submittingPoll}
                    style={{
                      fontSize: '1.1rem',
                      padding: '1rem 2rem',
                      minWidth: '200px'
                    }}
                  >
                    {submittingPoll ? (
                      <>
                        <span className="material-icons spinning" style={{ marginRight: '0.5rem' }}>
                          refresh
                        </span>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <span className="material-icons" style={{ marginRight: '0.5rem' }}>
                          send
                        </span>
                        Enviar Respuestas
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '50%',
                  width: '80px',
                  height: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 2rem auto'
                }}>
                  <span className="material-icons" style={{ fontSize: '2.5rem', color: '#10b981' }}>
                    check_circle
                  </span>
                </div>
                <h2 style={{ color: '#ffffff', marginBottom: '1rem' }}>
                  ¡Encuesta completada!
                </h2>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.1rem' }}>
                  Gracias por tu participación. Puedes cerrar esta ventana o esperar nuevas actualizaciones.
                </p>
              </div>
            )}
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
              rows="5"
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
                <p className="question-content">{question.content}</p>

                <div className="question-meta">
                  <span className="question-author">
                    <span className="material-icons">person</span>
                    {question.author_name}
                  </span>
                  <span className="question-time">
                    <span className="material-icons">schedule</span>
                    {new Date(question.created_at).toLocaleTimeString()}
                  </span>
                </div>

                <div className="question-actions">
                  <div className="vote-group">
                    {(() => {
                      const hasVoted = votedQuestions.has(question.id)
                      const isDisabled = question.is_answered || hasVoted

                      return (
                        <button
                          className={`btn ${hasVoted ? 'btn-voted' : 'btn-secondary'}`}
                          onClick={() => handleVote(question.id, question.votes)}
                          disabled={isDisabled}
                          title={hasVoted ? 'Ya votaste por esta pregunta' : 'Votar por esta pregunta'}
                        >
                          <span className="material-icons" style={{ fontSize: '1rem', marginRight: '0.25rem' }}>
                            {hasVoted ? 'check' : 'thumb_up'}
                          </span>
                          {hasVoted ? 'Votado' : 'Votar'}
                        </button>
                      )
                    })()}
                    <span className="vote-count">
                      {question.votes} votos
                    </span>
                  </div>
                  {question.is_featured && (
                    <span className="badge-featured">
                      <span className="material-icons" style={{ fontSize: '1rem' }}>star</span>
                      Destacada
                    </span>
                  )}
                  {question.is_answered && (
                    <span className="badge-answered">
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