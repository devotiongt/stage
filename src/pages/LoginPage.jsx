import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './LoginPage.css'

function LoginPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading, isApproved, signIn, resendConfirmation } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false)
  const [resendEmail, setResendEmail] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  // Redirect if user is already logged in
  useEffect(() => {
    if (!authLoading && user) {
      if (isApproved) {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/status', { replace: true })
      }
    }
  }, [user, authLoading, isApproved, navigate])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
    setEmailNotConfirmed(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await signIn(formData.email, formData.password)

    if (error) {
      if (error.code === 'email_not_confirmed') {
        setEmailNotConfirmed(true)
        setResendEmail(formData.email)
        setError('Tu email aún no ha sido confirmado. Revisa tu bandeja de entrada o reenvía el email de confirmación.')
      } else if (error.message === 'Invalid login credentials') {
        setError('Email o contraseña incorrectos')
      } else {
        setError('Error al iniciar sesión. Por favor intenta nuevamente.')
      }
      setLoading(false)
    } else {
      navigate('/dashboard')
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const { resetPassword } = useAuth()
    const { error } = await resetPassword(resetEmail)
    
    if (error) {
      setError('Error al enviar el email de recuperación')
    } else {
      setResetSent(true)
    }
    setLoading(false)
  }

  const handleResendConfirmation = async () => {
    setLoading(true)
    const { error } = await resendConfirmation(resendEmail)
    
    if (error) {
      setError('Error al reenviar el email de confirmación')
    } else {
      setError('Email de confirmación reenviado. Revisa tu bandeja de entrada.')
      setEmailNotConfirmed(false)
    }
    setLoading(false)
  }

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="login-page">
        <div className="login-container" style={{ justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <span className="material-icons spinning" style={{ fontSize: '3rem', color: '#8338ec', marginBottom: '1rem' }}>
              sync
            </span>
            <p>Verificando sesión...</p>
          </div>
        </div>
      </div>
    )
  }

  if (showResetPassword) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <div className="logo-section">
                <span className="material-icons logo-icon">theater_comedy</span>
                <h1>Stage</h1>
              </div>
              {resetSent ? (
                <>
                  <span className="material-icons success-icon">check_circle</span>
                  <h2>Email Enviado</h2>
                  <p>Revisa tu bandeja de entrada para restablecer tu contraseña</p>
                  <button 
                    className="btn-primary"
                    onClick={() => {
                      setShowResetPassword(false)
                      setResetSent(false)
                      setResetEmail('')
                    }}
                  >
                    Volver al Login
                  </button>
                </>
              ) : (
                <>
                  <h2>Recuperar Contraseña</h2>
                  <p>Te enviaremos un email para restablecer tu contraseña</p>
                </>
              )}
            </div>

            {!resetSent && (
              <form onSubmit={handleResetPassword} className="login-form">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    placeholder="tu@organizacion.org"
                  />
                </div>

                {error && (
                  <div className="error-message">
                    <span className="material-icons">error</span>
                    {error}
                  </div>
                )}

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="material-icons spinning">sync</span>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <span className="material-icons">mail</span>
                      Enviar Email
                    </>
                  )}
                </button>

                <button 
                  type="button"
                  className="btn-text"
                  onClick={() => {
                    setShowResetPassword(false)
                    setError('')
                  }}
                >
                  Volver al Login
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="logo-section">
              <span className="material-icons logo-icon">theater_comedy</span>
              <h1>Stage</h1>
            </div>
            <h2>Bienvenido de vuelta</h2>
            <p>Ingresa a tu cuenta para gestionar tus eventos</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="tu@organizacion.org"
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label>Contraseña</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className={`error-message ${emailNotConfirmed ? 'with-action' : ''}`}>
                <span className="material-icons">error</span>
                <div className="error-content">
                  <span>{error}</span>
                  {emailNotConfirmed && (
                    <button
                      type="button"
                      className="btn-text-small"
                      onClick={handleResendConfirmation}
                      disabled={loading}
                    >
                      {loading ? 'Reenviando...' : 'Reenviar Email de Confirmación'}
                    </button>
                  )}
                </div>
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="material-icons spinning">sync</span>
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <span className="material-icons">login</span>
                  Iniciar Sesión
                </>
              )}
            </button>

            <button 
              type="button"
              className="btn-text"
              onClick={() => setShowResetPassword(true)}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </form>

          <div className="login-footer">
            <p>¿No tienes una cuenta?</p>
            <Link to="/signup" className="btn-secondary">
              <span className="material-icons">person_add</span>
              Crear Cuenta
            </Link>
          </div>
        </div>

        <div className="login-info">
          <h3>Plataforma exclusiva para ONGs</h3>
          <p>
            Stage es una herramienta gratuita para organizaciones sin fines de lucro 
            que buscan mejorar la interacción en sus eventos.
          </p>
          
          <div className="features-list">
            <div className="feature-item">
              <span className="material-icons">check_circle</span>
              <span>100% Gratuito para ONGs verificadas</span>
            </div>
            <div className="feature-item">
              <span className="material-icons">check_circle</span>
              <span>Q&A en tiempo real</span>
            </div>
            <div className="feature-item">
              <span className="material-icons">check_circle</span>
              <span>Eventos ilimitados</span>
            </div>
            <div className="feature-item">
              <span className="material-icons">check_circle</span>
              <span>Soporte dedicado</span>
            </div>
          </div>

          <div className="devotion-credit">
            <p>Un proyecto de</p>
            <img src="/stage/devotion-logo.png" alt="Devotion" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage