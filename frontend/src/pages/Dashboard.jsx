import { useNavigate } from 'react-router-dom'
import { Code2, GitBranch, Target, Clock, ArrowRight, Upload, Zap } from 'lucide-react'
import StatCard from '@/components/StatCard'
import { useMigration } from '@/context/MigrationContext'

const PIPELINE_STEPS = ['Upload', 'Parse', 'IR Build', 'Generate', 'Validate', 'Deploy']

export default function Dashboard() {
  const navigate = useNavigate()
  const { uploadedRepo, pipelineResult, metrics } = useMigration()

  // Real shape: { success, data: { repo_id, status, ir, generated_code, validation, metrics } }
  const pData    = pipelineResult?.data || pipelineResult
  const pMetrics = pData?.metrics || {}

  const totalRoutes     = pMetrics.total_routes      ?? 0
  const routesConverted = pMetrics.routes_converted  ?? 0
  const executionMs     = pMetrics.execution_ms      ?? 0
  const accuracy        = totalRoutes > 0 ? ((routesConverted / totalRoutes) * 100).toFixed(1) : '—'

  const stats = [
    { label: 'Routes Found',     value: totalRoutes || '—',                        icon: Code2,     color: 'var(--accent2)' },
    { label: 'Routes Converted', value: routesConverted || '—',                    icon: GitBranch, color: 'var(--green)' },
    { label: 'Accuracy',         value: accuracy, sub: totalRoutes ? '%' : '',     icon: Target,    color: 'var(--orange)' },
    { label: 'Execution Time',   value: executionMs ? (executionMs/1000).toFixed(2) : '—', sub: executionMs ? 's' : '', icon: Clock, color: '#a78bfa' },
  ]

  const currentStep = pData?.status === 'completed' ? 6
    : pData?.status === 'parsing' ? 2
    : uploadedRepo ? 1 : 0

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 32px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>Dashboard</h1>
        <p style={{ color: 'var(--text2)', fontSize: 14 }}>
          {uploadedRepo ? `Active repo: ${uploadedRepo.original_filename}` : 'No repository loaded yet. Upload one to get started.'}
        </p>
      </div>

      {!uploadedRepo && (
        <div className="card" style={{
          marginBottom: 28,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(124,58,237,0.06))',
          border: '1px solid rgba(99,102,241,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Ready to migrate your Django project?</h2>
            <p style={{ color: 'var(--text2)', fontSize: 14 }}>Upload a ZIP file and the pipeline starts automatically.</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/upload')}>
            <Upload size={14} /> Upload Repository <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Pipeline progress */}
      <div className="card" style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Migration Pipeline</p>
        <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', paddingBottom: 4 }}>
          {PIPELINE_STEPS.map((step, i) => {
            const done   = i < currentStep
            const active = i === currentStep - 1
            return (
              <div key={step} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '8px 14px', borderRadius: 8,
                  background: active ? 'rgba(99,102,241,0.15)' : done ? 'rgba(16,185,129,0.1)' : 'var(--bg3)',
                  border: `1px solid ${active ? 'rgba(99,102,241,0.4)' : done ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
                  fontSize: 12, fontWeight: 500,
                  color: active ? 'var(--accent3)' : done ? 'var(--green2)' : 'var(--text3)',
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: active ? 'var(--accent)' : done ? 'var(--green)' : 'var(--text3)',
                    animation: active ? 'pulse-glow 1.5s infinite' : 'none',
                  }} />
                  {step}
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div style={{ width: 24, height: 1, background: done ? 'rgba(16,185,129,0.4)' : 'var(--border)', flexShrink: 0 }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div className="card">
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={14} color="var(--accent2)" /> Latest Migration Result
          </p>
          {pData ? (
            <div>
              {[
                ['Repository',       uploadedRepo?.original_filename || 'Unknown'],
                ['Status',           <span key="s" className="badge badge-green">Completed</span>],
                ['Routes',           `${routesConverted} / ${totalRoutes}`],
                ['IR Route Nodes',   pMetrics.ir_route_nodes ?? '—'],
                ['IR Model Nodes',   pMetrics.ir_model_nodes ?? '—'],
                ['Generated LOC',    pMetrics.generated_route_loc ?? '—'],
                ['Execution time',   executionMs ? `${(executionMs/1000).toFixed(2)}s` : '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text2)' }}>{k}</span>
                  <span style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              <button className="btn btn-primary" style={{ marginTop: 16, width: '100%', justifyContent: 'center' }} onClick={() => navigate('/pipeline')}>
                View Full Pipeline <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 14 }}>
              No migration run yet.
              <br />
              <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => navigate('/upload')}>
                Upload a repo <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>

        <div className="card">
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Quick Actions</p>
          {[
            { label: 'Upload new repo',      to: '/upload',   Icon: Upload },
            { label: 'View pipeline output', to: '/pipeline', Icon: GitBranch },
            { label: 'Check metrics',        to: '/metrics',  Icon: Target },
          ].map(({ label, to, Icon }) => (
            <button key={to} className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 8, fontSize: 13 }}
              onClick={() => navigate(to)}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}