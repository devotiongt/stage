import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import QRCode from 'react-qr-code'
import PollResultsChart from '../components/PollResultsChart'
import './PresentationScreen.css'

function PresentationScreen() {
  const { eventId } = useParams()
  const [event, setEvent] = useState(null)
  const [displayData, setDisplayData] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [activePoll, setActivePoll] = useState(null)
  const [pollResults, setPollResults] = useState(null)
  const [historicalPoll, setHistoricalPoll] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [lastFetchTime, setLastFetchTime] = useState(Date.now())
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [pendingDisplayData, setPendingDisplayData] = useState(null)
  const [currentDisplayKey, setCurrentDisplayKey] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const previousDisplayRef = useRef(null)
  const activePollRef = useRef(null)

  useEffect(() => {
    fetchEventData()
    const cleanup = setupRealtimeSubscription()
    
    return () => {
      cleanup()
    }
  }, [eventId])

  // useEffect separado para el sistema de respaldo que NO interfiere con la conexión
  useEffect(() => {
    let fallbackInterval

    // Dar tiempo para que la conexión se establezca antes de iniciar fallback
    const startFallback = setTimeout(() => {
      fallbackInterval = setInterval(() => {
        if (connectionStatus !== 'SUBSCRIBED') {
          console.log('🔄 Fallback: refreshing data due to poor connection')
          fetchCurrentDisplay()
        }
      }, 10000) // Polling cada 10 segundos solo si no hay conexión
    }, 5000) // Esperar 5 segundos antes de iniciar el polling

    return () => {
      clearTimeout(startFallback)
      if (fallbackInterval) {
        clearInterval(fallbackInterval)
      }
    }
  }, [eventId]) // Solo una vez por evento, no por cada cambio de status

  // useEffect para manejar transiciones suaves
  useEffect(() => {
    if (pendingDisplayData) {
      // Hay nuevo contenido esperando, iniciar transición
      setIsTransitioning(true)
      
      // Después de la animación de salida, cambiar contenido
      const changeContentTimer = setTimeout(() => {
        setDisplayData(pendingDisplayData)
        if (pendingDisplayData.question) {
          setCurrentQuestion(pendingDisplayData.question)
        }
        previousDisplayRef.current = pendingDisplayData // Actualizar referencia
        setPendingDisplayData(null)
        setCurrentDisplayKey(prev => prev + 1)
        
        // Pequeño delay para permitir que el DOM se actualice
        setTimeout(() => {
          setIsTransitioning(false)
          console.log('✨ Animation transition completed')
        }, 50)
      }, 200) // Tiempo de animación de salida
      
      return () => {
        clearTimeout(changeContentTimer)
      }
    }
  }, [pendingDisplayData])

  // Funciones para manejar fullscreen
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error)
    }
  }

  // useEffect para detectar cambios de fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    const handleKeyPress = (event) => {
      // F11 o F para toggle fullscreen
      if (event.key === 'F11' || (event.key === 'f' || event.key === 'F')) {
        event.preventDefault()
        toggleFullscreen()
      }
      // Escape para salir del fullscreen
      if (event.key === 'Escape' && document.fullscreenElement) {
        document.exitFullscreen()
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('keydown', handleKeyPress)
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [])

  const fetchEventData = async () => {
    try {
      // Función para verificar si es un UUID válido
      const isValidUUID = (str) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        return uuidRegex.test(str)
      }
      
      let eventData = null
      let eventError = null
      
      if (isValidUUID(eventId)) {
        // Si es UUID, buscar por ID
        const result = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single()
        
        eventData = result.data
        eventError = result.error
      } else {
        // Si no es UUID, buscar por access_code
        const result = await supabase
          .from('events')
          .select('*')
          .eq('access_code', eventId.toUpperCase())
          .single()
        
        eventData = result.data
        eventError = result.error
      }

      if (eventError) {
        console.error('Error fetching event:', eventError)
        return
      }

      setEvent(eventData)

      // Obtener el display activo actual
      await fetchCurrentDisplay()
      
      // Obtener encuesta activa
      await fetchActivePoll()
      
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCurrentDisplay = async () => {
    try {
      const { data: displayData, error: displayError } = await supabase
        .from('presentation_display')
        .select(`
          *,
          question:questions(*),
          polls(*)
        `)
        .eq('event_id', eventId)
        .eq('is_active', true)
        .single()

      if (displayError && displayError.code !== 'PGRST116') {
        console.error('Error fetching display:', displayError)
        return
      }

      const newDisplayData = displayData || { display_type: 'welcome' }
      
      // Verificar si hay cambio significativo en el display
      const currentDisplay = previousDisplayRef.current
      const hasChanged = currentDisplay && (
        currentDisplay.display_type !== newDisplayData.display_type ||
        (newDisplayData.display_type === 'question' && currentDisplay.question_id !== newDisplayData.question_id) ||
        (newDisplayData.display_type === 'custom_message' && currentDisplay.custom_message !== newDisplayData.custom_message) ||
        (newDisplayData.display_type === 'poll_results' && currentDisplay.poll_id !== newDisplayData.poll_id)
      )
      
      if (hasChanged) {
        // Hay cambio, usar animación
        console.log('🎬 Content change detected, starting animation transition')
        setPendingDisplayData(newDisplayData)
      } else {
        // Primera carga o sin cambios, actualizar directamente
        console.log('📄 Direct content update (no animation needed)')
        setDisplayData(newDisplayData)
        if (newDisplayData.question) {
          setCurrentQuestion(newDisplayData.question)
        }
        // Si es poll_results, cargar la encuesta histórica
        if (newDisplayData.display_type === 'poll_results' && newDisplayData.poll_id) {
          await fetchHistoricalPoll(newDisplayData.poll_id)
        }
        previousDisplayRef.current = newDisplayData
      }
      
      setLastFetchTime(Date.now())

    } catch (error) {
      console.error('Error fetching display:', error)
    }
  }

  const fetchActivePoll = async () => {
    try {
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .select(`
          *,
          poll_questions (
            *,
            poll_options (*)
          )
        `)
        .eq('event_id', eventId)
        .eq('status', 'active')
        .single()

      if (pollError && pollError.code !== 'PGRST116') {
        console.error('Error fetching active poll:', pollError)
        return
      }

      setActivePoll(pollData || null)
      activePollRef.current = pollData || null // Actualizar la referencia también
      console.log('📊 Active poll:', pollData ? `"${pollData.title}"` : 'None')
      
      // Si hay encuesta activa, obtener resultados
      if (pollData) {
        await fetchPollResults(pollData.id)
      } else {
        setPollResults(null)
      }

    } catch (error) {
      console.error('Error fetching active poll:', error)
    }
  }

  const fetchHistoricalPoll = async (pollId) => {
    try {
      console.log('📊 Obteniendo encuesta histórica:', pollId)
      
      // Obtener los datos completos de la encuesta específica
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .select(`
          *,
          poll_questions (
            *,
            poll_options (*)
          )
        `)
        .eq('id', pollId)
        .single()

      if (pollError) {
        console.error('Error fetching historical poll:', pollError)
        return
      }

      setHistoricalPoll(pollData)
      console.log('📊 Encuesta histórica cargada:', pollData?.title)
      
      // Obtener resultados de esta encuesta
      if (pollData) {
        await fetchPollResults(pollId, pollData)
      }

    } catch (error) {
      console.error('Error fetching historical poll:', error)
    }
  }

  const fetchPollResults = async (pollId, pollData = null) => {
    try {
      console.log('📈 Obteniendo resultados de encuesta:', pollId)
      
      // Obtener todas las respuestas de la encuesta
      const { data: responses, error } = await supabase
        .from('poll_responses')
        .select(`
          *,
          poll_questions (*),
          poll_options (*)
        `)
        .eq('poll_id', pollId)

      if (error) {
        console.error('Error fetching poll results:', error)
        return
      }

      // Procesar los resultados por pregunta
      const resultsByQuestion = {}
      
      const currentPoll = pollData || activePollRef.current || activePoll
      console.log('📈 Poll actual para procesamiento:', currentPoll)
      
      if (currentPoll && currentPoll.poll_questions) {
        currentPoll.poll_questions.forEach(question => {
          const questionResponses = responses.filter(r => r.question_id === question.id)
          
          if (question.question_type === 'text') {
            // Para preguntas de texto, mostrar las respuestas como lista
            resultsByQuestion[question.id] = {
              type: 'text',
              question: question.question_text,
              responses: questionResponses.map(r => r.response_text).filter(Boolean),
              total: questionResponses.length
            }
          } else {
            // Para preguntas de selección, contar por opción
            const optionCounts = {}
            let totalVotes = 0
            
            question.poll_options.forEach(option => {
              optionCounts[option.id] = {
                text: option.option_text,
                count: 0,
                percentage: 0
              }
            })
            
            questionResponses.forEach(response => {
              if (response.option_id && optionCounts[response.option_id]) {
                optionCounts[response.option_id].count++
                totalVotes++
              }
            })
            
            // Calcular porcentajes
            Object.keys(optionCounts).forEach(optionId => {
              if (totalVotes > 0) {
                optionCounts[optionId].percentage = 
                  Math.round((optionCounts[optionId].count / totalVotes) * 100)
              }
            })
            
            resultsByQuestion[question.id] = {
              type: question.question_type,
              question: question.question_text,
              options: optionCounts,
              total: totalVotes
            }
          }
        })
      }
      
      setPollResults(resultsByQuestion)
      console.log('📈 Resultados procesados:', resultsByQuestion)
      
    } catch (error) {
      console.error('Error processing poll results:', error)
    }
  }

  const setupRealtimeSubscription = () => {
    let subscription = null
    let isCleaningUp = false

    console.log(`🔄 Setting up realtime connection for event: ${eventId}`)

    subscription = supabase
      .channel(`presentation-${eventId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: eventId }
        }
      })
      .on('broadcast', { event: 'presentation_update' }, (payload) => {
        console.log('📡 Broadcast message received:', payload)
        fetchCurrentDisplay()
      })
      .on('broadcast', { event: 'poll_launched' }, (payload) => {
        console.log('📊 Poll launched broadcast received:', payload)
        fetchActivePoll()
      })
      .on('broadcast', { event: 'poll_ended' }, (payload) => {
        console.log('📊 Poll ended broadcast received:', payload)
        fetchActivePoll()
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'poll_responses',
        },
        (payload) => {
          console.log('📈 Nueva respuesta de encuesta recibida:', payload)
          console.log('📈 Estado de activePollRef:', activePollRef.current)
          if (activePollRef.current) {
            console.log('📈 Actualizando resultados para poll:', activePollRef.current.id)
            fetchPollResults(activePollRef.current.id)
          } else {
            console.log('❌ No hay activePoll activo, no se pueden actualizar resultados')
          }
        }
      )
      .subscribe((status, err) => {
        if (isCleaningUp) {
          console.log('🚫 Ignoring status change during cleanup:', status)
          return
        }

        console.log(`🔌 Subscription status: ${status}`, err ? `Error: ${err}` : '')
        setConnectionStatus(status)
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully connected to realtime - will use fallback polling as backup')
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.log(`⚠️ Connection lost: ${status}, relying on fallback polling`)
        }
      })

    return () => {
      console.log('🧹 Cleaning up realtime subscription')
      isCleaningUp = true
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }

  const getBackgroundClass = () => {
    if (!displayData) return 'welcome-bg'
    
    switch (displayData.display_type) {
      case 'welcome':
        return 'welcome-bg'
      case 'qr_code':
        return 'qr-bg'
      case 'question':
        return currentQuestion?.is_featured ? 'question-featured-bg' : 'question-bg'
      case 'custom_message':
        return 'custom-bg'
      case 'active_poll':
        return 'poll-bg'
      case 'poll_results':
        return 'poll-bg'
      default:
        return 'welcome-bg'
    }
  }

  const renderDisplay = () => {
    // Si hay resultados de encuesta histórica para mostrar
    if (displayData?.display_type === 'poll_results' && historicalPoll && pollResults) {
      return (
        <div className="presentation-content poll-results">
          <div className="poll-results-container">
            <div className="poll-header-horizontal">
              <div className="poll-title-section">
                <h1 className="poll-title">{historicalPoll.title}</h1>
                <div className="poll-meta">
                  <span className="material-icons" style={{ color: '#6b7280', fontSize: '0.9rem' }}>●</span>
                  <span>Resultados finales</span>
                </div>
              </div>
              <div className="poll-access-code">
                <span className="code-label">Código:</span>
                <span className="code-value">{event?.access_code}</span>
              </div>
            </div>

            <div className="poll-results-content">
              <PollResultsChart 
                pollResults={pollResults} 
                activePoll={historicalPoll} 
              />
            </div>
          </div>
        </div>
      )
    }

    // Si hay una encuesta activa Y el display está configurado para mostrarla
    if (activePoll && displayData?.display_type === 'active_poll') {
      return (
        <div className="presentation-content poll-results">
          <div className="poll-results-container">
            <div className="poll-header-horizontal">
              <div className="poll-title-section">
                <h1 className="poll-title">{activePoll.title}</h1>
                <div className="poll-meta">
                  <span className="material-icons pulse" style={{ color: '#10b981', fontSize: '0.9rem' }}>●</span>
                  <span>En vivo</span>
                </div>
              </div>
              <div className="poll-access-code">
                <span className="code-label">Código:</span>
                <span className="code-value">{event?.access_code}</span>
              </div>
            </div>

            <div className="poll-results-content">
              {pollResults ? (
                <PollResultsChart 
                  pollResults={pollResults} 
                  activePoll={activePoll} 
                />
              ) : (
                <div className="loading-results">
                  <div className="loading-spinner">
                    <span className="material-icons spinning">refresh</span>
                  </div>
                  <h3>Preparando resultados...</h3>
                  <p>Los gráficos aparecerán cuando lleguen las primeras respuestas</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }

    if (!displayData) {
      return (
        <div className="presentation-content welcome">
          <div className="welcome-message">
            <h1>Bienvenidos</h1>
            <p>Esperando contenido...</p>
          </div>
        </div>
      )
    }

    switch (displayData.display_type) {
      case 'welcome':
        return (
          <div className="presentation-content welcome">
            <div className="welcome-message">
              <h1>Bienvenidos a</h1>
              <h2>{event?.name}</h2>
              <p>{event?.description}</p>
              <div className="event-info">
                <span className="material-icons">theater_comedy</span>
                <span>Stage - Panel Interactivo</span>
              </div>
            </div>
          </div>
        )

      case 'qr_code':
        const eventUrl = `${window.location.origin}/stage/event/${event?.access_code}`
        return (
          <div className="presentation-content qr-code">
            <div className="qr-section-horizontal">
              <div className="qr-left">
                <div className="qr-container-large">
                  <QRCode
                    value={eventUrl}
                    size={600}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="M"
                  />
                </div>
              </div>
              <div className="qr-right">
                <h2>Únete al Evento</h2>
                <div className="access-info">
                  <h3>Código de Acceso</h3>
                  <div className="access-code">{event?.access_code}</div>
                  <p>Escanea el código QR o ingresa a:</p>
                  <p className="event-url"><strong>{window.location.host}/stage/event/{event?.access_code}</strong></p>
                </div>
              </div>
            </div>
          </div>
        )

      case 'question':
        if (!currentQuestion) {
          return (
            <div className="presentation-content question">
              <div className="question-message">
                <h2>Pregunta no encontrada</h2>
              </div>
            </div>
          )
        }
        
        return (
          <div className={`presentation-content question ${currentQuestion.is_featured ? 'featured' : ''}`}>
            <div className="question-display">
              <div className="question-header">
                {currentQuestion.is_featured && (
                  <div className="featured-badge">
                    <span className="material-icons">star</span>
                    <span>Destacada</span>
                  </div>
                )}
              </div>
              <div className="question-content">
                <h2>"{currentQuestion.content}"</h2>
              </div>
              <div className="question-meta">
                <div className="author">
                  <span className="material-icons">person</span>
                  <span>{currentQuestion.author_name}</span>
                </div>
                <div className="votes">
                  <span className="material-icons">thumb_up</span>
                  <span>{currentQuestion.votes} votos</span>
                </div>
              </div>
            </div>
          </div>
        )

      case 'custom_message':
        return (
          <div className="presentation-content custom">
            <div className="custom-message">
              <h2>{displayData.custom_message}</h2>
            </div>
          </div>
        )

      default:
        return renderDisplay({ display_type: 'welcome' })
    }
  }

  if (loading) {
    return (
      <div className="presentation-screen">
        <div className="loading-screen">
          <div className="loading-content">
            <span className="material-icons spinning">refresh</span>
            <h2>Cargando Presentación...</h2>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="presentation-screen">
      {/* Status indicator */}
      <div className={`connection-status ${connectionStatus}`}>
        <span className="status-dot"></span>
        <span className="status-text">
          {connectionStatus === 'SUBSCRIBED' ? 'Conectado' : 
           connectionStatus === 'CLOSED' ? 'Reconectando...' :
           connectionStatus === 'CHANNEL_ERROR' ? 'Error - Reconectando...' :
           connectionStatus === 'FAILED' ? 'Sin conexión en tiempo real' :
           'Conectando...'}
        </span>
        {process.env.NODE_ENV === 'development' && (
          <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '2px' }}>
            Última actualización: {new Date(lastFetchTime).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Fullscreen toggle button */}
      <button 
        className="fullscreen-btn"
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
      >
        <span className="material-icons">
          {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
        </span>
      </button>

      <div className={`content-wrapper ${getBackgroundClass()} ${isTransitioning ? 'transitioning' : ''}`}>
        {renderDisplay()}
      </div>

      {/* Event info footer */}
      <div className="event-footer">
        <div className="footer-content">
          <span className="event-name">{event?.name}</span>
          <span className="powered-by">
            <span className="material-icons">theater_comedy</span>
            Stage
          </span>
        </div>
      </div>
    </div>
  )
}

export default PresentationScreen