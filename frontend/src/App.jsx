import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import Landing from '@/pages/Landing'
import Dashboard from '@/pages/Dashboard'
import Upload from '@/pages/Upload'
import Pipeline from '@/pages/Pipeline'
import Metrics from '@/pages/Metrics'
import History from '@/pages/History'
import SchemaInsights from '@/pages/SchemaInsights'
import SQLPreview from '@/pages/SQLPreview'

function AppLayout({ children }) {
  return (
    <div className="page-wrapper">
      <div className="noise" />
      <Navbar />
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout><Landing /></AppLayout>} />
        <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
        <Route path="/upload" element={<AppLayout><Upload /></AppLayout>} />
        <Route path="/pipeline" element={<AppLayout><Pipeline /></AppLayout>} />
        <Route path="/metrics" element={<AppLayout><Metrics /></AppLayout>} />
        <Route path="/history" element={<AppLayout><History /></AppLayout>} />
        <Route path="/schema-insights" element={<AppLayout><SchemaInsights /></AppLayout>} />
        <Route path="/sql-preview" element={<AppLayout><SQLPreview /></AppLayout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}