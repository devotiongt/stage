import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './DashboardLayout.css'

function DashboardLayout({ children, title, subtitle }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { permissions, signOut, user, userRole } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      if (!mobile) {
        setMobileOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Panel de Control',
      icon: 'dashboard',
      path: '/dashboard',
      show: permissions?.canAccessDashboard
    },
    {
      id: 'users',
      label: 'Gestión Usuarios',
      icon: 'admin_panel_settings',
      path: '/admin-verification',
      show: permissions?.canManageUsers,
      badge: userRole === 'super_admin' ? 'SUPER' : null
    },
    {
      id: 'settings',
      label: 'Configuración',
      icon: 'settings',
      path: '/settings',
      show: false  // Ocultar hasta implementar funcionalidad
    }
  ]

  const handleMenuClick = (path) => {
    navigate(path)
    setMobileOpen(false)
  }

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen)
    } else {
      setSidebarCollapsed(!sidebarCollapsed)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar Overlay */}
      {mobileOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="material-icons logo-icon">theater_comedy</span>
            <span className="logo-text">Stage</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.filter(item => item.show).map(item => (
            <button
              key={item.id}
              className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => handleMenuClick(item.path)}
            >
              <span className="material-icons">{item.icon}</span>
              <span className="sidebar-item-text">
                {item.label}
                {item.badge && <span className="menu-badge">{item.badge}</span>}
              </span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              <span className="material-icons">account_circle</span>
            </div>
            <div className="user-details">
              <span className="user-email">{user?.email}</span>
              <span className="user-role">
                {userRole === 'super_admin' ? 'Super Admin' : 'Usuario'}
              </span>
            </div>
          </div>
          <button className="sidebar-item logout-btn" onClick={handleSignOut}>
            <span className="material-icons">logout</span>
            <span className="sidebar-item-text">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Top Bar */}
        <header className="top-bar">
          <div className="top-bar-left">
            <button 
              className="menu-toggle"
              onClick={toggleSidebar}
            >
              <span className="material-icons">
                {isMobile 
                  ? (mobileOpen ? 'close' : 'menu')
                  : (sidebarCollapsed ? 'menu_open' : 'menu')
                }
              </span>
            </button>
            <div className="page-title">
              <h1>{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
          <div className="top-bar-right">
            <button className="btn btn-secondary" onClick={() => navigate('/')}>
              <span className="material-icons">home</span>
              Inicio
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout