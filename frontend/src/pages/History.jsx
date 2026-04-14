import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, GitBranch, Target, CheckCircle2, XCircle, ArrowRight, RefreshCw, Trash2, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { getMigrationHistory, deleteMigration } from '@/api'

const STATUS_STYLE = {
  completed:  { cls:'badge-green',  label:'Completed',   dot:'var(--green)' },
  failed:     { cls:'badge-red',    label:'Failed',      dot:'var(--red)' },
  parsing:    { cls:'badge-orange', label:'Parsing',     dot:'var(--orange)' },
  uploaded:   { cls:'badge-blue',   label:'Uploaded',    dot:'var(--accent2)' },
  generating: { cls:'badge-orange', label:'Generating',  dot:'var(--orange)' },
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ textAlign:'center' }}>
      <p style={{ fontSize:18, fontWeight:700, fontFamily:'var(--font-head)', color: color || 'var(--text)' }}>{value}</p>
      <p style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</p>
    </div>
  )
}

function HistoryRow({ item, onView, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const status = STATUS_STYLE[item.status] || STATUS_STYLE.uploaded
  const exp    = item.experiments?.[0]  // latest experiment for this repo
  const accuracy = exp?.conversion_accuracy != null ? Number(exp.conversion_accuracy).toFixed(1) : null

  return (
    <div style={{
      background:'var(--bg2)', border:'1px solid var(--border)',
      borderRadius:12, overflow:'hidden',
      transition:'border-color 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {/* Main row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 120px 100px 100px 100px 120px', gap:16, padding:'16px 20px', alignItems:'center' }}>

        {/* Repo name */}
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <GitBranch size={13} color="var(--accent2)" />
            <span style={{ fontSize:14, fontWeight:600 }}>{item.original_filename}</span>
          </div>
          <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'monospace' }}>
            {String(item.id).slice(0, 8)}…
          </div>
        </div>

        {/* Status */}
        <span className={`badge ${status.cls}`} style={{ justifySelf:'start' }}>
          <span style={{ width:5, height:5, borderRadius:'50%', background:status.dot, display:'inline-block' }} />
          {status.label}
        </span>

        {/* Accuracy */}
        <div style={{ textAlign:'center' }}>
          {accuracy != null ? (
            <span style={{ fontSize:14, fontWeight:600, color: Number(accuracy) >= 90 ? 'var(--green2)' : Number(accuracy) >= 70 ? 'var(--orange)' : 'var(--red)' }}>
              {accuracy}%
            </span>
          ) : <span style={{ color:'var(--text3)', fontSize:13 }}>—</span>}
        </div>

        {/* Routes */}
        <div style={{ textAlign:'center', fontSize:13, color:'var(--text2)' }}>
          {exp ? `${exp.routes_converted}/${exp.total_routes_found}` : '—'}
        </div>

        {/* Date */}
        <div style={{ fontSize:12, color:'var(--text3)' }}>
          {new Date(item.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
          <button onClick={() => onView(item)} style={{
            display:'flex', alignItems:'center', gap:4,
            padding:'5px 10px', borderRadius:7, border:'1px solid var(--border2)',
            background:'transparent', color:'var(--text2)', fontSize:12, cursor:'pointer',
            transition:'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(99,102,241,0.1)'; e.currentTarget.style.color='var(--accent3)' }}
            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text2)' }}
          >
            View <ArrowRight size={11} />
          </button>
          <button onClick={() => setExpanded(!expanded)} style={{
            padding:'5px 8px', borderRadius:7, border:'1px solid var(--border)',
            background:'transparent', color:'var(--text3)', cursor:'pointer',
          }}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button onClick={() => onDelete(item.id)} style={{
            padding:'5px 8px', borderRadius:7, border:'1px solid var(--border)',
            background:'transparent', color:'var(--text3)', cursor:'pointer',
            transition:'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.color='var(--red)'; e.currentTarget.style.borderColor='rgba(239,68,68,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.color='var(--text3)'; e.currentTarget.style.borderColor='var(--border)' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Expanded experiments */}
      {expanded && item.experiments?.length > 0 && (
        <div style={{ borderTop:'1px solid var(--border)', padding:'16px 20px', background:'var(--bg1)' }}>
          <p style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:12 }}>
            Experiment Runs ({item.experiments.length})
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {item.experiments.map((exp, i) => (
              <div key={exp.id} style={{
                display:'grid', gridTemplateColumns:'1fr 80px 80px 80px 80px 100px',
                gap:12, padding:'10px 14px', borderRadius:8,
                background:'var(--bg2)', border:'1px solid var(--border)',
                fontSize:12, alignItems:'center',
              }}>
                <span style={{ fontWeight:500, color:'var(--text2)' }}>{exp.experiment_name}</span>
                <span className="badge badge-gray" style={{ fontSize:10, justifySelf:'start' }}>{exp.parser_version}</span>
                <span style={{ color:'var(--green2)', textAlign:'center' }}>{Number(exp.conversion_accuracy).toFixed(1)}%</span>
                <span style={{ color:'var(--text2)', textAlign:'center' }}>{exp.routes_converted}/{exp.total_routes_found}</span>
                <span style={{ color:'var(--text3)', textAlign:'center' }}>{(exp.total_execution_ms/1000).toFixed(2)}s</span>
                <span style={{ color:'var(--text3)', fontSize:11 }}>
                  {new Date(exp.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function History() {
  const navigate = useNavigate()
  const [migrations, setMigrations] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [search,     setSearch]     = useState('')
  const [filter,     setFilter]     = useState('all')
  const [deleting,   setDeleting]   = useState(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await getMigrationHistory()
      setMigrations(res.data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this migration? This cannot be undone.')) return
    setDeleting(id)
    try {
      await deleteMigration(id)
      setMigrations(prev => prev.filter(m => m.id !== id))
    } catch (e) {
      alert('Failed to delete: ' + e.message)
    } finally {
      setDeleting(null)
    }
  }

  const handleView = (item) => {
    navigate('/pipeline', { state: { historyItem: item } })
  }

  // Filter + search
  const filtered = migrations.filter(m => {
    const matchSearch = m.original_filename?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || m.status === filter
    return matchSearch && matchFilter
  })

  // Summary stats
  const total     = migrations.length
  const completed = migrations.filter(m => m.status === 'completed').length
  const avgAcc    = migrations.length > 0
    ? (migrations.reduce((sum, m) => sum + (m.experiments?.[0]?.conversion_accuracy || 0), 0) / migrations.length).toFixed(1)
    : '—'
  const totalRoutes = migrations.reduce((sum, m) => sum + (m.experiments?.[0]?.routes_converted || 0), 0)

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'36px 32px' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-head)', fontSize:26, fontWeight:700, letterSpacing:'-0.02em', marginBottom:4 }}>
            Migration History
          </h1>
          <p style={{ color:'var(--text2)', fontSize:14 }}>All past repository migrations and experiment results.</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost" onClick={load} style={{ fontSize:13 }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/upload')} style={{ fontSize:13 }}>
            New Migration <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {[
          { label:'Total Migrations', value:total,        color:'var(--accent2)' },
          { label:'Completed',        value:completed,    color:'var(--green2)' },
          { label:'Avg Accuracy',     value: avgAcc === '—' ? '—' : `${avgAcc}%`, color:'var(--orange)' },
          { label:'Routes Converted', value:totalRoutes,  color:'#a78bfa' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign:'center' }}>
            <p style={{ fontSize:28, fontWeight:700, fontFamily:'var(--font-head)', color:s.color, lineHeight:1, marginBottom:6 }}>{s.value}</p>
            <p style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text3)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by filename…"
            style={{ paddingLeft:34, borderRadius:9 }}
          />
        </div>
        <div style={{ display:'flex', gap:4 }}>
          {['all','completed','failed','parsing'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding:'8px 14px', borderRadius:8, border:'1px solid var(--border)',
              background: filter === f ? 'var(--accent)' : 'transparent',
              color: filter === f ? 'white' : 'var(--text2)',
              fontSize:12, fontWeight:500, cursor:'pointer', textTransform:'capitalize',
              transition:'all 0.15s',
            }}>{f === 'all' ? 'All' : f}</button>
          ))}
        </div>
      </div>

      {/* Table header */}
      <div style={{
        display:'grid', gridTemplateColumns:'1fr 120px 100px 100px 100px 120px',
        gap:16, padding:'8px 20px', marginBottom:8,
        fontSize:11, fontWeight:600, color:'var(--text3)',
        textTransform:'uppercase', letterSpacing:'0.05em',
      }}>
        <span>Repository</span>
        <span>Status</span>
        <span style={{ textAlign:'center' }}>Accuracy</span>
        <span style={{ textAlign:'center' }}>Routes</span>
        <span>Date</span>
        <span style={{ textAlign:'right' }}>Actions</span>
      </div>

      {/* Rows */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text3)' }}>
          <RefreshCw size={24} className="spinner" style={{ margin:'0 auto 12px' }} />
          <p>Loading migrations…</p>
        </div>
      ) : error ? (
        <div style={{ padding:'20px', borderRadius:10, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#f87171', fontSize:13, textAlign:'center' }}>
          {error} — <button onClick={load} style={{ background:'none', border:'none', color:'var(--accent3)', cursor:'pointer', fontSize:13 }}>retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text3)' }}>
          <GitBranch size={40} style={{ margin:'0 auto 12px', opacity:0.3 }} />
          <p style={{ fontSize:15, marginBottom:8 }}>{search || filter !== 'all' ? 'No results found' : 'No migrations yet'}</p>
          {!search && filter === 'all' && (
            <button className="btn btn-primary" style={{ marginTop:8 }} onClick={() => navigate('/upload')}>
              Start your first migration <ArrowRight size={13} />
            </button>
          )}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map(m => (
            <HistoryRow
              key={m.id}
              item={m}
              onView={handleView}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}