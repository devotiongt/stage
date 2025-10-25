// Script para crear un evento de prueba
// Ejecutar en la consola del navegador

const createTestEvent = async () => {
  try {
    // Crear el evento
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        name: 'Evento de Prueba - Encuestas',
        description: 'Evento creado para probar el sistema de encuestas en tiempo real',
        access_code: 'L38QXF',
        admin_code: 'ADMIN01',
        status: 'active',
        created_by: 'system' // o el ID del usuario actual
      })
      .select()
      .single()

    if (eventError) {
      console.error('Error creando evento:', eventError)
      return
    }

    console.log('✅ Evento creado:', event)
    
    // Crear algunas preguntas de ejemplo
    const questions = [
      {
        event_id: event.id,
        content: '¿Qué les parece el sistema de encuestas?',
        author_name: 'Moderador',
        votes: 5,
        is_answered: false,
        is_featured: true
      },
      {
        event_id: event.id,
        content: '¿Les gustaría ver más funcionalidades interactivas?',
        author_name: 'Usuario Ejemplo',
        votes: 3,
        is_answered: false,
        is_featured: false
      }
    ]

    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .insert(questions)
      .select()

    if (questionsError) {
      console.error('Error creando preguntas:', questionsError)
    } else {
      console.log('✅ Preguntas creadas:', questionsData)
    }

    // Crear las tablas de encuestas si no existen (ejecutar SQL)
    console.log('📋 Evento listo para usar:')
    console.log('🔗 URL Audiencia: /stage/event/L38QXF')
    console.log('🔧 URL Admin: /stage/admin/L38QXF (código: ADMIN01)')
    console.log('📺 URL Presentación: /stage/presentation/L38QXF')
    
    return event

  } catch (error) {
    console.error('Error general:', error)
  }
}

// Ejecutar
createTestEvent();