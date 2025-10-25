import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session
    checkUser()

    // Timeout de seguridad para el loading
    const loadingTimeout = setTimeout(() => {
      console.warn('⚠️ Loading timeout reached, forcing loading to false')
      setLoading(false)
    }, 5000) // 5 segundos máximo

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event, session?.user?.email)
      
      // Limpiar el timeout ya que recibimos respuesta
      clearTimeout(loadingTimeout)
      
      if (session?.user) {
        setUser(session.user)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      clearTimeout(loadingTimeout)
      authListener?.subscription.unsubscribe()
    }
  }, [])

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
      }
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }



  const signUp = async (email, password, organizationData) => {
    try {
      console.log('🚀 Starting signup process...')
      console.log('📧 Email:', email)
      console.log('🏢 Organization data:', organizationData)
      
      // 1. Create auth user first
      console.log('👤 Creating auth user...')
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            // Store all organization data in user metadata
            ...organizationData,
            status: 'pending_verification'
          }
        }
      })

      console.log('👤 Auth response:', { data: authData, error: authError })

      if (authError) {
        console.error('❌ Auth error:', authError)
        throw authError
      }

      console.log('✅ User created with organization data in metadata!')

      console.log('✅ Signup process completed successfully')
      return { data: authData, error: null }
    } catch (error) {
      console.error('❌ Error in signUp:', error)
      return { data: null, error }
    }
  }

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error('Error in signIn:', error)
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setUser(null)
      return { error: null }
    } catch (error) {
      console.error('Error in signOut:', error)
      return { error }
    }
  }

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/stage/reset-password`
      })

      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Error in resetPassword:', error)
      return { error }
    }
  }

  const resendConfirmation = async (email) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })

      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Error in resendConfirmation:', error)
      return { error }
    }
  }

  const refreshUser = async () => {
    try {
      console.log('🔄 Refreshing user data...')
      
      // Refrescar la sesión para obtener datos actualizados
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()
      
      if (refreshError) {
        console.warn('Session refresh failed:', refreshError)
        // Fallback: obtener usuario actual
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (currentUser) {
          console.log('✅ Got current user as fallback:', currentUser.user_metadata)
          setUser(currentUser)
          return { user: currentUser, error: null }
        }
      } else {
        console.log('✅ Session refreshed, new user data:', session.user?.user_metadata)
        setUser(session.user)
        return { user: session.user, error: null }
      }
      
      return { user: null, error: refreshError }
    } catch (error) {
      console.error('Error refreshing user:', error)
      return { user: null, error }
    }
  }

  // Admin functions - these would need backend implementation
  const getOrganizations = async (filter = 'all') => {
    try {
      // In a real implementation, this would be a backend API call
      // For now, we'll return mock data or use a different approach
      console.log('getOrganizations called with filter:', filter)
      return { data: [], error: null }
    } catch (error) {
      console.error('Error in getOrganizations:', error)
      return { data: [], error }
    }
  }

  const updateOrganizationStatus = async (userId, status, rejectionReason = null) => {
    try {
      // In a real implementation, this would be a backend API call
      console.log('updateOrganizationStatus called:', { userId, status, rejectionReason })
      return { error: null }
    } catch (error) {
      console.error('Error in updateOrganizationStatus:', error)
      return { error }
    }
  }

  // Función para asignar roles a usuarios (solo para super_admin)
  const assignUserRole = async (userEmail, newRole) => {
    try {
      if (userRole !== 'super_admin') {
        throw new Error('Solo los super administradores pueden asignar roles')
      }

      // Validar que el rol sea válido (solo super_admin o user)
      if (newRole !== 'super_admin' && newRole !== 'user') {
        throw new Error('Rol inválido. Solo se permite: super_admin o user')
      }

      console.log('Asignando rol:', { userEmail, newRole, assignedBy: user?.email })
      
      // Actualizar rol en metadata usando función RPC de Supabase
      const { data, error } = await supabase.rpc('update_user_role', {
        target_email: userEmail,
        new_role: newRole
      })

      if (error) {
        console.error('Error actualizando rol:', error)
        throw error
      }

      console.log('Rol asignado exitosamente')
      return { error: null }
    } catch (error) {
      console.error('Error in assignUserRole:', error)
      return { error }
    }
  }

  // Sistema de roles simplificado - Solo super_admin o user
  const getUserRole = () => {
    if (!user) return 'guest'
    
    // Si tiene rol super_admin en metadata, es super admin
    if (user.user_metadata?.role === 'super_admin') {
      return 'super_admin'
    }
    
    // Todos los demás son usuarios normales
    return 'user'
  }

  const userRole = getUserRole()

  const permissions = {
    // Solo super_admin puede gestionar usuarios
    canManageUsers: userRole === 'super_admin',
    
    // Todos pueden gestionar eventos (si están aprobados)
    canManageEvents: user?.user_metadata?.status === 'approved',
    
    // Todos pueden crear eventos (si están aprobados)
    canCreateEvents: user?.user_metadata?.status === 'approved',
    
    // Todos pueden acceder al dashboard (si están aprobados)
    canAccessDashboard: user?.user_metadata?.status === 'approved',
    
    // Solo super_admin puede acceder a configuración
    canManageSettings: userRole === 'super_admin'
  }

  // Debug logs temporales
  console.log('🔍 Auth Debug:', {
    user: user?.email,
    role: userRole,
    status: user?.user_metadata?.status,
    permissions: permissions,
    isApproved: user?.user_metadata?.status === 'approved',
    isPending: user?.user_metadata?.status === 'pending_verification',
    isRejected: user?.user_metadata?.status === 'rejected'
  })

  const value = {
    user,
    profile: user?.user_metadata || null,
    loading,
    userRole,
    permissions,
    signUp,
    signIn,
    signOut,
    resetPassword,
    resendConfirmation,
    refreshUser,
    getOrganizations,
    updateOrganizationStatus,
    assignUserRole,
    isApproved: user?.user_metadata?.status === 'approved',
    isPending: user?.user_metadata?.status === 'pending_verification',
    isRejected: user?.user_metadata?.status === 'rejected',
    // Mantener compatibilidad hacia atrás
    isAdmin: permissions.canManageUsers
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}