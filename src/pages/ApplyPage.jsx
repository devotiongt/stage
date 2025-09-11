import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './ApplyPage.css'

function ApplyPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading, isApproved, signUp } = useAuth()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: 'kevinalbertoorellana@gmail.com',
    password: '123456',
    confirmPassword: '123456',
    organization_name: 'La biblia abierta',
    country: 'GT',
    phone: '+502 1234-5678',
    website: 'https://www.labiabiertalgt.org',
    facebook: 'facebook.com/labibliaabiertaggt',
    instagram: '@labibliaabiertaggt',
    twitter: '@labibliaabiertaggt',
    linkedin: 'linkedin.com/company/labibliaabiertaggt',
    description: 'Una organización dedicada a la enseñanza bíblica y eventos comunitarios en Guatemala',
    event_types: 'Conferencias, talleres bíblicos, eventos comunitarios',
    expected_attendance: '51-100'
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
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // Validations
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    
    if (!formData.organization_name.trim()) {
      setError('El nombre de la organización es requerido')
      return
    }

    setLoading(true)

    try {
      const { email, password, confirmPassword, ...organizationData } = formData
      const { error } = await signUp(email, password, organizationData)

      if (error) {
        console.error('Signup error:', error)
        if (error.message === 'User already registered') {
          setError('Ya existe una cuenta con este email')
        } else if (error.message?.includes('email')) {
          setError('Error con el email. Verifica que sea válido.')
        } else if (error.code === '42501') {
          setError('Error de permisos. Contacta al administrador.')
        } else {
          setError(`Error al crear la cuenta: ${error.message}`)
        }
      } else {
        setSubmitted(true)
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Error al crear la cuenta. Por favor intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="apply-page">
        <div className="apply-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
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

  if (submitted) {
    return (
      <div className="apply-page">
        <nav className="navbar">
          <div className="nav-container">
            <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
              <span className="material-icons logo-icon">theater_comedy</span>
              <span className="logo-text">Stage</span>
            </div>
          </div>
        </nav>

        <div className="apply-container">
          <div className="success-message">
            <span className="material-icons success-icon">check_circle</span>
            <h1>¡Cuenta Creada!</h1>
            <p>Tu cuenta ha sido creada exitosamente.</p>
            <p>Nuestro equipo verificará tu organización y te notificaremos por email en las próximas 24-48 horas.</p>
            <button className="btn-primary" onClick={() => navigate('/')}>
              Volver al Inicio
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="apply-page">
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <span className="material-icons logo-icon">theater_comedy</span>
            <span className="logo-text">Stage</span>
          </div>
          <div className="nav-links">
            <button className="btn-nav-secondary" onClick={() => navigate('/')}>
              <span className="material-icons">arrow_back</span>
              Volver
            </button>
          </div>
        </div>
      </nav>

      <div className="apply-container">
        <div className="apply-header">
          <h1>Crear Cuenta</h1>
          <p>Registra tu organización para obtener acceso gratuito a Stage</p>
        </div>

        <form className="apply-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>
              <span className="material-icons">account_circle</span>
              Datos de Acceso
            </h3>
            
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Email *</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required 
                  placeholder="contacto@organizacion.org" 
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label>Contraseña *</label>
                <div className="password-input-container">
                  <input 
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required 
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-icons">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Confirmar Contraseña *</label>
                <div className="password-input-container">
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required 
                    placeholder="Repetir contraseña"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <span className="material-icons">
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>
              <span className="material-icons">business</span>
              Información de la Organización
            </h3>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Nombre de la Organización *</label>
                <input 
                  type="text" 
                  name="organization_name"
                  value={formData.organization_name}
                  onChange={handleChange}
                  required 
                  placeholder="Ej: Fundación Esperanza" 
                />
              </div>

              <div className="form-group">
                <label>País *</label>
                <select 
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleccione un país</option>
                  <option value="GT">Guatemala</option>
                  <option value="MX">México</option>
                  <option value="CO">Colombia</option>
                  <option value="AR">Argentina</option>
                  <option value="CL">Chile</option>
                  <option value="PE">Perú</option>
                  <option value="EC">Ecuador</option>
                  <option value="BO">Bolivia</option>
                  <option value="PY">Paraguay</option>
                  <option value="UY">Uruguay</option>
                  <option value="VE">Venezuela</option>
                  <option value="PA">Panamá</option>
                  <option value="CR">Costa Rica</option>
                  <option value="NI">Nicaragua</option>
                  <option value="HN">Honduras</option>
                  <option value="SV">El Salvador</option>
                  <option value="DO">República Dominicana</option>
                  <option value="PR">Puerto Rico</option>
                  <option value="CU">Cuba</option>
                  <option value="ES">España</option>
                  <option value="other">Otro</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>
              <span className="material-icons">contact_mail</span>
              Información de Contacto
            </h3>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Email de Contacto *</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required 
                  placeholder="contacto@organizacion.org" 
                />
              </div>

              <div className="form-group">
                <label>Teléfono</label>
                <input 
                  type="tel" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+502 1234-5678" 
                />
              </div>

              <div className="form-group full-width">
                <label>Sitio Web</label>
                <input 
                  type="url" 
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://www.organizacion.org" 
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>
              <span className="material-icons">share</span>
              Redes Sociales
            </h3>
            <p className="section-description">
              Comparte tus redes sociales para que podamos conocer mejor tu trabajo
            </p>
            
            <div className="form-grid">
              <div className="form-group">
                <label>
                  <span className="social-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </span>
                  Facebook
                </label>
                <input 
                  type="text" 
                  name="facebook"
                  value={formData.facebook}
                  onChange={handleChange}
                  placeholder="facebook.com/organizacion" 
                />
              </div>

              <div className="form-group">
                <label>
                  <span className="social-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.405a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z"/>
                    </svg>
                  </span>
                  Instagram
                </label>
                <input 
                  type="text" 
                  name="instagram"
                  value={formData.instagram}
                  onChange={handleChange}
                  placeholder="@organizacion" 
                />
              </div>

              <div className="form-group">
                <label>
                  <span className="social-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </span>
                  Twitter / X
                </label>
                <input 
                  type="text" 
                  name="twitter"
                  value={formData.twitter}
                  onChange={handleChange}
                  placeholder="@organizacion" 
                />
              </div>

              <div className="form-group">
                <label>
                  <span className="social-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                  </span>
                  LinkedIn
                </label>
                <input 
                  type="text" 
                  name="linkedin"
                  value={formData.linkedin}
                  onChange={handleChange}
                  placeholder="linkedin.com/company/organizacion" 
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>
              <span className="material-icons">info</span>
              Sobre tu Organización
            </h3>
            
            <div className="form-group full-width">
              <label>Descripción de la Organización *</label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4" 
                required 
                placeholder="Cuéntanos sobre tu misión, visión y las actividades principales que realizan..."
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Tipos de Eventos que Realizan</label>
                <input 
                  type="text" 
                  name="event_types"
                  value={formData.event_types}
                  onChange={handleChange}
                  placeholder="Ej: Conferencias, talleres, webinars" 
                />
              </div>

              <div className="form-group">
                <label>Asistencia Promedio a Eventos</label>
                <select 
                  name="expected_attendance"
                  value={formData.expected_attendance}
                  onChange={handleChange}
                >
                  <option value="">Seleccione un rango</option>
                  <option value="1-50">1-50 personas</option>
                  <option value="51-100">51-100 personas</option>
                  <option value="101-250">101-250 personas</option>
                  <option value="251-500">251-500 personas</option>
                  <option value="500+">Más de 500 personas</option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <span className="material-icons">error</span>
              {error}
            </div>
          )}

          <div className="form-actions">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={() => navigate('/')}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="material-icons spinning">sync</span>
                  Creando cuenta...
                </>
              ) : (
                <>
                  <span className="material-icons">person_add</span>
                  Crear Cuenta
                </>
              )}
            </button>
          </div>

          <div className="form-footer">
            <p>¿Ya tienes una cuenta?</p>
            <Link to="/login" className="login-link">
              <span className="material-icons">login</span>
              Iniciar Sesión
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ApplyPage