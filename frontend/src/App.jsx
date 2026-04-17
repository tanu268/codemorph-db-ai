import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Navbar from '@/components/Navbar'
import Landing from '@/pages/Landing'
import Dashboard from '@/pages/Dashboard'
import Upload from '@/pages/Upload'
import Pipeline from '@/pages/Pipeline'
import Metrics from '@/pages/Metrics'
import History from '@/pages/History'
import SchemaInsights from '@/pages/SchemaInsights'
import SQLPreview from '@/pages/SQLPreview'
import Login from '@/pages/Login'
import { MigrationProvider } from '@/context/MigrationContext'
import { AuthProvider } from '@/context/AuthContext'

function AppLayout({ children }) {
  return (
    <div className="page-wrapper">
      <div className="noise" />
      <Navbar />
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  )
}

// ← Protects routes — redirects to /login if not authenticated
function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ color: '#fff', padding: '2rem' }}>Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MigrationProvider>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<Login />} />

            {/* Protected routes */}
            <Route path="/" element={<PrivateRoute><AppLayout><Landing /></AppLayout></PrivateRoute>} />
            <Route path="/dashboard" element={<PrivateRoute><AppLayout><Dashboard /></AppLayout></PrivateRoute>} />
            <Route path="/upload" element={<PrivateRoute><AppLayout><Upload /></AppLayout></PrivateRoute>} />
            <Route path="/pipeline" element={<PrivateRoute><AppLayout><Pipeline /></AppLayout></PrivateRoute>} />
            <Route path="/metrics" element={<PrivateRoute><AppLayout><Metrics /></AppLayout></PrivateRoute>} />
            <Route path="/history" element={<PrivateRoute><AppLayout><History /></AppLayout></PrivateRoute>} />
            <Route path="/schema-insights" element={<PrivateRoute><AppLayout><SchemaInsights /></AppLayout></PrivateRoute>} />
            <Route path="/sql-preview" element={<PrivateRoute><AppLayout><SQLPreview /></AppLayout></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MigrationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}