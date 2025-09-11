import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { AuthProvider } from './contexts/AuthContext'
import LandingPage from './pages/LandingPage'
import EventDashboard from './pages/EventDashboard'
import AudienceView from './pages/AudienceView'
import AdminPanel from './pages/AdminPanel'
import ApplyPage from './pages/ApplyPage'
import LoginPage from './pages/LoginPage'
import StatusPage from './pages/StatusPage'
import AdminVerificationPanel from './pages/AdminVerificationPanel'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

function App() {
  const [events, setEvents] = useState([])

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching events:', error)
      } else {
        setEvents(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return (
    <AuthProvider>
      <Router basename="/stage">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<ApplyPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/status" element={<ProtectedRoute><StatusPage /></ProtectedRoute>} />
          <Route path="/admin-verification" element={<ProtectedRoute><AdminVerificationPanel /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><EventDashboard events={events} onRefresh={fetchEvents} /></ProtectedRoute>} />
          <Route path="/event/:eventId" element={<AudienceView />} />
          <Route path="/admin/:eventId" element={<AdminPanel />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App