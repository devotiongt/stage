import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import '../pages/LandingPage.css'

function PollManager({ eventId, onShowPollResults }) {
  const [polls, setPolls] = useState([])
  const [activePoll, setActivePoll] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingPoll, setEditingPoll] = useState(null)
  const [loading, setLoading] = useState(true)

  // Estados para crear/editar encuesta
  const [pollTitle, setPollTitle] = useState('')
  const [questions, setQuestions] = useState([
    {
      id: Date.now(),
      question_text: '',
      question_type: 'single_choice',
      options: ['', ''],
      is_required: true
    }
  ])

  useEffect(() => {
    fetchPolls()
  }, [eventId])

  const fetchPolls = async () => {
    try {
      const { data, error } = await supabase
        .from('polls')
        .select(`
          *,
          poll_questions (
            *,
            poll_options (*)
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setPolls(data || [])
      
      // Buscar encuesta activa
      const active = data?.find(poll => poll.status === 'active')
      setActivePoll(active)
    } catch (error) {
      console.error('Error fetching polls:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePoll = () => {
    setPollTitle('')
    setQuestions([
      {
        id: Date.now(),
        question_text: '',
        question_type: 'single_choice',
        options: ['', ''],
        is_required: true
      }
    ])
    setShowCreateModal(true)
  }

  const handleEditPoll = (poll) => {
    setEditingPoll(poll)
    setPollTitle(poll.title)
    
    // Convertir las preguntas del poll a formato editable
    const formattedQuestions = poll.poll_questions.map(q => ({
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.poll_options.map(opt => opt.option_text),
      is_required: q.is_required
    }))
    
    setQuestions(formattedQuestions.length > 0 ? formattedQuestions : [
      {
        id: Date.now(),
        question_text: '',
        question_type: 'single_choice',
        options: ['', ''],
        is_required: true
      }
    ])
    
    setShowEditModal(true)
  }

  const addQuestion = () => {
    setQuestions([...questions, {
      id: Date.now(),
      question_text: '',
      question_type: 'single_choice',
      options: ['', ''],
      is_required: true
    }])
  }

  const removeQuestion = (questionId) => {
    if (questions.length <= 1) return
    setQuestions(questions.filter(q => q.id !== questionId))
  }

  const updateQuestion = (questionId, field, value) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, [field]: value } : q
    ))
  }

  const addOption = (questionId) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, options: [...q.options, ''] } : q
    ))
  }

  const removeOption = (questionId, optionIndex) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? {
        ...q, 
        options: q.options.filter((_, i) => i !== optionIndex)
      } : q
    ))
  }

  const updateOption = (questionId, optionIndex, value) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? {
        ...q,
        options: q.options.map((opt, i) => i === optionIndex ? value : opt)
      } : q
    ))
  }

  const savePoll = async () => {
    if (!pollTitle.trim()) {
      alert('El título de la encuesta es requerido')
      return
    }

    const validQuestions = questions.filter(q => 
      q.question_text.trim() && 
      (q.question_type === 'text' || q.options.some(opt => opt.trim()))
    )

    if (validQuestions.length === 0) {
      alert('Agrega al menos una pregunta válida')
      return
    }

    try {
      let pollId = editingPoll?.id

      if (editingPoll) {
        // Actualizar encuesta existente
        const { error: updateError } = await supabase
          .from('polls')
          .update({ title: pollTitle.trim() })
          .eq('id', editingPoll.id)

        if (updateError) throw updateError

        // Eliminar preguntas y opciones existentes
        await supabase.from('poll_questions').delete().eq('poll_id', editingPoll.id)
      } else {
        // Crear nueva encuesta
        const { data: pollData, error: pollError } = await supabase
          .from('polls')
          .insert({
            event_id: eventId,
            title: pollTitle.trim(),
            status: 'draft'
          })
          .select()
          .single()

        if (pollError) throw pollError
        pollId = pollData.id
      }

      // Insertar preguntas
      for (let i = 0; i < validQuestions.length; i++) {
        const question = validQuestions[i]
        
        const { data: questionData, error: questionError } = await supabase
          .from('poll_questions')
          .insert({
            poll_id: pollId,
            question_text: question.question_text.trim(),
            question_type: question.question_type,
            is_required: question.is_required,
            order_index: i
          })
          .select()
          .single()

        if (questionError) throw questionError

        // Insertar opciones si no es pregunta de texto
        if (question.question_type !== 'text') {
          const validOptions = question.options.filter(opt => opt.trim())
          
          if (validOptions.length > 0) {
            const optionsData = validOptions.map((opt, idx) => ({
              question_id: questionData.id,
              option_text: opt.trim(),
              order_index: idx
            }))

            const { error: optionsError } = await supabase
              .from('poll_options')
              .insert(optionsData)

            if (optionsError) throw optionsError
          }
        }
      }

      await fetchPolls()
      setShowCreateModal(false)
      setShowEditModal(false)
      setEditingPoll(null)
      
    } catch (error) {
      console.error('Error saving poll:', error)
      alert('Error al guardar la encuesta')
    }
  }

  const launchPoll = async (pollId) => {
    if (!confirm('¿Deseas lanzar esta encuesta? Se mostrará a todos los participantes.')) return

    try {
      // Usar la función activate_poll si existe, o actualizar directamente
      const { error } = await supabase.rpc('activate_poll', { p_poll_id: pollId })
      
      if (error) {
        console.log('⚠️ RPC function not found, using direct table update instead')
        // Fallback: activar manualmente
        await supabase.from('polls').update({ status: 'ended' }).eq('event_id', eventId).eq('status', 'active')
        await supabase.from('polls').update({ status: 'active', started_at: new Date().toISOString() }).eq('id', pollId)
      }

      await fetchPolls()

      // Enviar broadcast para notificar el cambio
      console.log('📡 Enviando broadcast para poll_launched...')
      
      const broadcastPayload = { poll_id: pollId, event_id: eventId, timestamp: new Date().toISOString() }
      
      // Canal de presentación (usado por PresentationScreen)
      const presentationChannel = supabase.channel(`presentation-${eventId}`)
      await presentationChannel.send({
        type: 'broadcast',
        event: 'poll_launched',
        payload: broadcastPayload
      })
      
      // TAMBIÉN enviar al canal que usan los asistentes
      const audienceChannel = supabase.channel(`event-${eventId}`)
      await audienceChannel.send({
        type: 'broadcast',
        event: 'poll_launched',
        payload: broadcastPayload
      })
      
      console.log('📡 Broadcast enviado a ambos canales:', broadcastPayload)
      console.log('ℹ️ Los asistentes recibirán la notificación via broadcast Y postgres_changes')

    } catch (error) {
      console.error('Error launching poll:', error)
      alert('Error al lanzar la encuesta')
    }
  }

  const endPoll = async () => {
    if (!activePoll || !confirm('¿Deseas terminar la encuesta activa?')) return

    try {
      const { error } = await supabase
        .from('polls')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', activePoll.id)

      if (error) throw error

      await fetchPolls()

      // Enviar broadcast a ambos canales
      const broadcastPayload = { poll_id: activePoll.id, event_id: eventId, timestamp: new Date().toISOString() }
      
      const presentationChannel = supabase.channel(`presentation-${eventId}`)
      await presentationChannel.send({
        type: 'broadcast',
        event: 'poll_ended',
        payload: broadcastPayload
      })
      
      const audienceChannel = supabase.channel(`event-${eventId}`)
      await audienceChannel.send({
        type: 'broadcast',
        event: 'poll_ended',
        payload: broadcastPayload
      })
      
      console.log('📡 Poll ended broadcast sent to both channels')

    } catch (error) {
      console.error('Error ending poll:', error)
      alert('Error al terminar la encuesta')
    }
  }

  const deletePoll = async (pollId) => {
    if (!confirm('¿Estás seguro de eliminar esta encuesta? Esta acción no se puede deshacer.')) return

    try {
      const { error } = await supabase
        .from('polls')
        .delete()
        .eq('id', pollId)

      if (error) throw error
      await fetchPolls()
    } catch (error) {
      console.error('Error deleting poll:', error)
      alert('Error al eliminar la encuesta')
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando encuestas...</div>
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: '0 0 0.5rem 0' }}>
            <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: '0.5rem' }}>
              poll
            </span>
            Gestión de Encuestas
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
            Crea y gestiona encuestas interactivas para tu evento
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleCreatePoll}>
          <span className="material-icons" style={{ marginRight: '0.5rem' }}>add</span>
          Nueva Encuesta
        </button>
      </div>

      {activePoll && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#10b981' }}>
                <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: '0.5rem' }}>
                  radio_button_checked
                </span>
                Encuesta Activa
              </h3>
              <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.8)' }}>
                {activePoll.title}
              </p>
            </div>
            <button className="btn btn-danger" onClick={endPoll}>
              <span className="material-icons" style={{ marginRight: '0.5rem' }}>stop</span>
              Terminar Encuesta
            </button>
          </div>
        </div>
      )}

      {polls.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255, 255, 255, 0.6)' }}>
          <span className="material-icons" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>
            poll
          </span>
          <h3 style={{ color: '#ffffff', marginBottom: '0.5rem' }}>No hay encuestas</h3>
          <p>Crea tu primera encuesta para comenzar a recopilar feedback de tu audiencia</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {polls.map(poll => (
            <div key={poll.id} style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#ffffff' }}>{poll.title}</h4>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem',
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginBottom: '1rem'
                  }}>
                    <span className={`status-badge ${poll.status}`}>
                      {poll.status === 'draft' && 'Borrador'}
                      {poll.status === 'active' && 'Activa'}
                      {poll.status === 'ended' && 'Finalizada'}
                    </span>
                    <span>{poll.poll_questions?.length || 0} preguntas</span>
                    <span>{new Date(poll.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  {/* Botón de mostrar resultados - disponible para todas las encuestas con respuestas */}
                  {(poll.status === 'ended' || poll.status === 'active') && (
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={() => onShowPollResults?.(poll.id)}
                      title="Mostrar resultados en pantalla"
                      style={{
                        background: 'rgba(58, 134, 255, 0.1)',
                        borderColor: 'rgba(58, 134, 255, 0.3)',
                        color: '#3a86ff'
                      }}
                    >
                      <span className="material-icons">bar_chart</span>
                    </button>
                  )}
                  
                  {poll.status !== 'active' && (
                    <>
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleEditPoll(poll)}
                        title="Editar encuesta"
                      >
                        <span className="material-icons">edit</span>
                      </button>
                      {poll.status === 'draft' && (
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => launchPoll(poll.id)}
                          title="Lanzar encuesta"
                        >
                          <span className="material-icons">play_arrow</span>
                        </button>
                      )}
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => deletePoll(poll.id)}
                        title="Eliminar encuesta"
                      >
                        <span className="material-icons">delete</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Crear/Editar Encuesta */}
      {(showCreateModal || showEditModal) && (
        <div className="modal-overlay" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}>
          <div className="modal-content" style={{ 
            maxWidth: '800px',
            background: 'linear-gradient(135deg, rgba(10, 10, 10, 0.98), rgba(26, 26, 46, 0.98))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPoll ? 'Editar Encuesta' : 'Nueva Encuesta'}</h2>
              <button 
                className="modal-close"
                onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
              >
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="input-group">
              <label>Título de la encuesta</label>
              <input
                type="text"
                value={pollTitle}
                onChange={(e) => setPollTitle(e.target.value)}
                placeholder="Ej: Encuesta de satisfacción del evento"
                required
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <label style={{ margin: 0 }}>Preguntas</label>
                <button type="button" className="btn btn-sm btn-secondary" onClick={addQuestion}>
                  <span className="material-icons" style={{ marginRight: '0.25rem' }}>add</span>
                  Agregar Pregunta
                </button>
              </div>

              {questions.map((question, qIndex) => (
                <div key={question.id} style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, color: '#ffffff' }}>Pregunta {qIndex + 1}</h4>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => removeQuestion(question.id)}
                      >
                        <span className="material-icons">delete</span>
                      </button>
                    )}
                  </div>

                  <div className="input-group">
                    <label>Texto de la pregunta</label>
                    <textarea
                      value={question.question_text}
                      onChange={(e) => updateQuestion(question.id, 'question_text', e.target.value)}
                      placeholder="Escribe tu pregunta aquí..."
                      rows="2"
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label>Tipo de pregunta</label>
                    <select
                      value={question.question_type}
                      onChange={(e) => updateQuestion(question.id, 'question_type', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: '#ffffff'
                      }}
                    >
                      <option value="single_choice">Selección única</option>
                      <option value="multiple_choice">Selección múltiple</option>
                      <option value="text">Texto libre</option>
                    </select>
                  </div>

                  {question.question_type !== 'text' && (
                    <div className="input-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <label style={{ margin: 0 }}>Opciones</label>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => addOption(question.id)}
                        >
                          <span className="material-icons" style={{ marginRight: '0.25rem' }}>add</span>
                          Agregar Opción
                        </button>
                      </div>
                      {question.options.map((option, oIndex) => (
                        <div key={oIndex} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => updateOption(question.id, oIndex, e.target.value)}
                            placeholder={`Opción ${oIndex + 1}`}
                            style={{ flex: 1 }}
                          />
                          {question.options.length > 2 && (
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => removeOption(question.id, oIndex)}
                            >
                              <span className="material-icons">remove</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={savePoll}
              >
                <span className="material-icons" style={{ marginRight: '0.5rem' }}>save</span>
                {editingPoll ? 'Guardar Cambios' : 'Crear Encuesta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PollManager