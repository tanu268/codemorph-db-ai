// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider }      from '@/context/AuthContext'
import { MigrationProvider } from '@/context/MigrationContext'
import ProtectedRoute        from '@/components/ProtectedRoute'
import Navbar        from '@/components/Navbar'
import Landing       from '@/pages/Landing'
import Dashboard     from '@/pages/Dashboard'
import Upload        from '@/pages/Upload'
import Pipeline      from '@/pages/Pipeline'
import Metrics       from '@/pages/Metrics'
import History       from '@/pages/History'
import SchemaInsights from '@/pages/SchemaInsights'
import SQLPreview    from '@/pages/SQLPreview'
import Login         from '@/pages/auth/Login'
import Register      from '@/pages/auth/Register'

function AppLayout({ children }) {
  return (
    <div className="page-wrapper">
      <div className="noise" />
      <Navbar />
      <main style={{ flex:1 }}>{children}</main>
    </div>
  )
}

const Protected = ({ children }) => (
  <ProtectedRoute><AppLayout>{children}</AppLayout></ProtectedRoute>
)

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MigrationProvider>
          <Routes>
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/"               element={<Protected><Landing /></Protected>} />
        
            <Route path="/dashboard"      element={<Protected><Dashboard /></Protected>} />
            <Route path="/upload"         element={<Protected><Upload /></Protected>} />
            <Route path="/pipeline"       element={<Protected><Pipeline /></Protected>} />
            <Route path="/metrics"        element={<Protected><Metrics /></Protected>} />
            <Route path="/history"        element={<Protected><History /></Protected>} />
            <Route path="/schema-insights" element={<Protected><SchemaInsights /></Protected>} />
            <Route path="/sql-preview"    element={<Protected><SQLPreview /></Protected>} />
            <Route path="*"               element={<Navigate to="/" replace />} />
          </Routes>
        </MigrationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}