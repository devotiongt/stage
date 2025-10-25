import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import './LandingPage.css'

function LandingPage() {
  const navigate = useNavigate()
  const { user, isApproved } = useAuth()
  const [eventCode, setEventCode] = useState('')
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState('')

  const handleJoinEvent = async (e) => {
    e.preventDefault()
    if (!eventCode.trim()) return

    setJoinLoading(true)
    setJoinError('')

    try {
      // Buscar el evento por access_code
      const { data, error } = await supabase
        .from('events')
        .select('id, status')
        .eq('access_code', eventCode.toUpperCase())
        .single()

      if (error || !data) {
        setJoinError('Código de evento no válido')
        return
      }

      if (data.status === 'ended') {
        setJoinError('Este evento ya ha finalizado')
        return
      }

      // Redirigir al evento
      navigate(`/event/${data.id}`)
    } catch (error) {
      console.error('Error joining event:', error)
      setJoinError('Error al buscar el evento')
    } finally {
      setJoinLoading(false)
    }
  }

  return (
    <div className="landing">
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo">
            <span className="material-icons logo-icon">theater_comedy</span>
            <span className="logo-text">Stage</span>
          </div>
          <div className="nav-links">
            <a href="#features">Características</a>
            <a href="#how-it-works">Cómo Funciona</a>
            <a href="#nonprofit">Para ONGs</a>
            {user ? (
              // Usuario con sesión activa
              <button 
                className="btn-nav-primary"
                onClick={() => navigate(isApproved ? '/dashboard' : '/status')}
              >
                <span className="material-icons">{isApproved ? 'dashboard' : 'hourglass_empty'}</span>
                {isApproved ? 'Dashboard' : 'Mi Estado'}
              </button>
            ) : (
              // Usuario sin sesión
              <>
                <button 
                  className="btn-nav-secondary"
                  onClick={() => navigate('/login')}
                >
                  <span className="material-icons">login</span>
                  Iniciar Sesión
                </button>
                <button 
                  className="btn-nav-primary"
                  onClick={() => navigate('/signup')}
                >
                  Crear Cuenta
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-background">
          <div className="spotlight spotlight-1"></div>
          <div className="spotlight spotlight-2"></div>
          <div className="spotlight spotlight-3"></div>
        </div>
        
        <div className="hero-content">
          <div className="hero-badge">
            <span className="pulse-dot"></span>
            ACCESO GRATUITO
          </div>
          
          <h1 className="hero-title">
            Transforma la <span className="gradient-text">Interacción</span> 
            <br />en tus Eventos
          </h1>
          
          <p className="hero-subtitle">
            Plataforma profesional de Q&A en tiempo real. 
            Gestiona preguntas del público y maximiza la participación.
          </p>
          
          <div className="hero-actions">
            {user ? (
              // Usuario con sesión activa
              <button 
                className="btn-hero-primary"
                onClick={() => navigate(isApproved ? '/dashboard' : '/status')}
              >
                <span className="material-icons btn-icon">{isApproved ? 'dashboard' : 'hourglass_empty'}</span>
                {isApproved ? 'Ir al Dashboard' : 'Ver Mi Estado'}
              </button>
            ) : (
              // Usuario sin sesión
              <button 
                className="btn-hero-primary"
                onClick={() => navigate('/signup')}
              >
                <span className="material-icons btn-icon">person_add</span>
                Crear Cuenta Gratuita
              </button>
            )}
            <button 
              className="btn-hero-secondary"
              onClick={() => setShowJoinModal(true)}
            >
              <span className="material-icons btn-icon">login</span>
              Unirse a Evento
            </button>
          </div>

          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">50+</span>
              <span className="stat-label">ONGs Activas</span>
            </div>
            <div className="stat">
              <span className="stat-number">100%</span>
              <span className="stat-label">Gratuito</span>
            </div>
            <div className="stat">
              <span className="stat-number">24/7</span>
              <span className="stat-label">Soporte</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="device-mockup">
            <div className="device-screen">
              <div className="demo-question">
                <div className="demo-author">María García</div>
                <div className="demo-content">¿Cómo puedo colaborar como voluntario en sus proyectos?</div>
                <div className="demo-votes">42 votos</div>
              </div>
              <div className="demo-question featured">
                <div className="demo-author">Carlos López</div>
                <div className="demo-content">¿Cuál es el impacto de las donaciones en la comunidad?</div>
                <div className="demo-votes">38 votos</div>
              </div>
              <div className="demo-question">
                <div className="demo-author">Ana Martínez</div>
                <div className="demo-content">¿Tienen programas de educación para jóvenes?</div>
                <div className="demo-votes">25 votos</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="nonprofit" className="nonprofit-section">
        <div className="container">
          <div className="section-header">
            <h2>Programa para ONGs</h2>
            <p>Acceso completo y gratuito para organizaciones verificadas</p>
          </div>

          <div className="nonprofit-benefits">
            <div className="benefit-card">
              <span className="material-icons benefit-icon">verified</span>
              <h3>Verificación Simple</h3>
              <p>Proceso rápido para confirmar el estatus de tu organización y otorgar acceso completo.</p>
            </div>

            <div className="benefit-card">
              <span className="material-icons benefit-icon">card_giftcard</span>
              <h3>100% Gratuito</h3>
              <p>Sin costos ocultos, sin límites de uso. Acceso completo a todas las funcionalidades sin restricciones.</p>
            </div>

            <div className="benefit-card">
              <span className="material-icons benefit-icon">support_agent</span>
              <h3>Soporte Dedicado</h3>
              <p>Equipo de soporte especializado para ayudarte a maximizar el impacto de tus eventos.</p>
            </div>
          </div>

          <div className="apply-process">
            <h3>Proceso de Aprobación</h3>
            <div className="process-steps">
              <div className="process-step">
                <div className="step-icon">
                  <span className="material-icons">description</span>
                </div>
                <h4>1. Solicitud</h4>
                <p>Envía tus datos básicos</p>
              </div>
              <div className="process-step">
                <div className="step-icon">
                  <span className="material-icons">fact_check</span>
                </div>
                <h4>2. Verificación</h4>
                <p>Confirmamos tu registro</p>
              </div>
              <div className="process-step">
                <div className="step-icon">
                  <span className="material-icons">celebration</span>
                </div>
                <h4>3. Aprobación</h4>
                <p>Recibe acceso completo en 24-48 horas</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="features">
        <div className="container">
          <div className="section-header">
            <h2>Características Profesionales</h2>
            <p>Todo lo que necesitas para eventos exitosos e interactivos</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <span className="material-icons">bolt</span>
              </div>
              <h3>Tiempo Real</h3>
              <p>Las preguntas aparecen instantáneamente sin recargar</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <span className="material-icons">admin_panel_settings</span>
              </div>
              <h3>Moderación Inteligente</h3>
              <p>Herramientas para destacar y organizar preguntas</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <span className="material-icons">poll</span>
              </div>
              <h3>Votación Democrática</h3>
              <p>La audiencia vota las preguntas más relevantes</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <span className="material-icons">lock</span>
              </div>
              <h3>Acceso Controlado</h3>
              <p>Códigos únicos para mantener tus eventos seguros</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <span className="material-icons">devices</span>
              </div>
              <h3>Multiplataforma</h3>
              <p>Funciona en cualquier dispositivo sin instalación</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <span className="material-icons">all_inclusive</span>
              </div>
              <h3>Sin Límites</h3>
              <p>Eventos ilimitados para audiencias de cualquier tamaño</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <div className="section-header">
            <h2>Cómo Funciona</h2>
            <p>Comienza a recibir preguntas en minutos</p>
          </div>

          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Crea tu Evento</h3>
                <p>Configura y obtén códigos de acceso únicos</p>
              </div>
            </div>

            <div className="step-connector"></div>

            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Comparte el Código</h3>
                <p>Los asistentes se unen fácilmente desde cualquier dispositivo</p>
              </div>
            </div>

            <div className="step-connector"></div>

            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Modera en Vivo</h3>
                <p>Gestiona las preguntas en tiempo real durante tu evento</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="devotion-section">
        <div className="container">
          <div className="devotion-content">
            <div className="devotion-logo">
              <img src="/stage/devotion-logo.png" alt="Devotion" />
            </div>
            <div className="devotion-info">
              <h3>Un Proyecto de Devotion</h3>
              <p>
                Stage es desarrollado y mantenido por <strong>Devotion</strong>, 
                una organización comprometida con democratizar el acceso a herramientas 
                tecnológicas profesionales.
              </p>
              <p>
                Creemos en el poder de la tecnología para amplificar el impacto social 
                y facilitar la conexión entre organizaciones y sus comunidades.
              </p>
              <a href="https://devotiongt.org" target="_blank" rel="noopener noreferrer" className="devotion-link">
                <span className="material-icons">open_in_new</span>
                Conoce más sobre Devotion
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <h2>¿Listo para Transformar tus Eventos?</h2>
            <p>{user ? 'Accede a tu cuenta y comienza a gestionar tus eventos' : 'Solicita acceso gratuito y comienza a usar Stage hoy mismo'}</p>
            {user ? (
              <button 
                className="btn-cta"
                onClick={() => navigate(isApproved ? '/dashboard' : '/status')}
              >
                <span className="material-icons">{isApproved ? 'dashboard' : 'hourglass_empty'}</span>
                {isApproved ? 'Ir al Dashboard' : 'Ver Mi Estado'}
              </button>
            ) : (
              <button 
                className="btn-cta"
                onClick={() => navigate('/signup')}
              >
                <span className="material-icons">person_add</span>
                Crear Cuenta Gratuita
              </button>
            )}
          </div>
          <div className="cta-visual">
            <div className="floating-card card-1">
              <span className="material-icons">school</span> Educación
            </div>
            <div className="floating-card card-2">
              <span className="material-icons">favorite</span> Salud
            </div>
            <div className="floating-card card-3">
              <span className="material-icons">nature_people</span> Ambiente
            </div>
            <div className="floating-card card-4">
              <span className="material-icons">groups</span> Comunidad
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="logo">
                <span className="material-icons logo-icon">theater_comedy</span>
                <span className="logo-text">Stage</span>
              </div>
              <p>Plataforma profesional de Q&A para eventos</p>
              <div className="footer-devotion">
                <p>Desarrollado por</p>
                <a href="https://devotiongt.org" target="_blank" rel="noopener noreferrer">
                  <img src="/stage/devotion-logo.png" alt="Devotion" style={{ height: '30px', marginTop: '0.5rem' }} />
                </a>
              </div>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4>Recursos</h4>
                <a href="#features">Características</a>
                <a href="#nonprofit">Para ONGs</a>
                <a href="#docs">Documentación</a>
              </div>
              <div className="footer-column">
                <h4>Soporte</h4>
                <a href="#help">Centro de Ayuda</a>
                <a href="#contact">Contacto</a>
                <a href="#faq">Preguntas Frecuentes</a>
              </div>
              <div className="footer-column">
                <h4>Legal</h4>
                <a href="#privacy">Privacidad</a>
                <a href="#terms">Términos de Uso</a>
                <a href="#nonprofit-terms">Términos para ONGs</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2024 Stage by Devotion. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowJoinModal(false)}>
              <span className="material-icons">close</span>
            </button>
            <h3>Unirse a un Evento</h3>
            <p>Ingresa el código proporcionado por la organización</p>
            
            {joinError && (
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.3)', 
                borderRadius: '8px', 
                padding: '0.75rem', 
                marginBottom: '1rem',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span className="material-icons" style={{ fontSize: '1.2rem' }}>error</span>
                {joinError}
              </div>
            )}
            
            <form onSubmit={handleJoinEvent}>
              <input
                type="text"
                placeholder="Ejemplo: ABC123"
                value={eventCode}
                onChange={(e) => {
                  setEventCode(e.target.value.toUpperCase())
                  setJoinError('')
                }}
                className="modal-input"
                autoFocus
                required
                disabled={joinLoading}
                maxLength={6}
              />
              <button 
                type="submit" 
                className="btn-modal-submit"
                disabled={joinLoading || !eventCode.trim()}
              >
                {joinLoading ? (
                  <>
                    <span className="material-icons spinning">refresh</span>
                    Buscando evento...
                  </>
                ) : (
                  <>
                    <span className="material-icons">login</span>
                    Unirse al Evento
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

export default LandingPage