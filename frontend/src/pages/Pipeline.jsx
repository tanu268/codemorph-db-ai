import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Check, ChevronRight, FileCode2, ArrowRight, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { useMigration } from '@/context/MigrationContext'
import { downloadOutput } from '@/api'

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <button onClick={copy} style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.06)', border:'1px solid var(--border2)', borderRadius:6, padding:'5px 12px', color:'var(--text2)', fontSize:12, cursor:'pointer' }}>
      {copied ? <Check size={12} color="var(--green2)" /> : <Copy size={12} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

const METHOD_STYLE = {
  GET:    { bg:'rgba(16,185,129,0.15)',  color:'#34d399' },
  POST:   { bg:'rgba(99,102,241,0.15)',  color:'#818cf8' },
  PUT:    { bg:'rgba(245,158,11,0.15)',  color:'#fbbf24' },
  PATCH:  { bg:'rgba(245,158,11,0.15)',  color:'#fbbf24' },
  DELETE: { bg:'rgba(239,68,68,0.15)',   color:'#f87171' },
}

function toStr(val) {
  if (!val) return ''
  if (typeof val === 'string') return val
  return JSON.stringify(val, null, 2)
}

export default function Pipeline() {
  const navigate = useNavigate()
  const { pipelineResult, uploadedRepo } = useMigration()
  const [activeFile, setActiveFile] = useState('app_js')
  const [activeTab,  setActiveTab]  = useState('files')

  const pData = pipelineResult?.data || pipelineResult
  const gen   = pData?.generated_code || {}
  const ir    = pData?.ir || null
  const val   = pData?.validation || {}

  const files = [
    { id:'app_js',       label:'app.js',          content: gen.app_js },
    { id:'routes',       label:'routes/index.js',  content: gen.routes },
    { id:'models',       label:'models/',           content: gen.models },
    { id:'middleware',   label:'middleware/',        content: gen.middleware },
    { id:'database_js',  label:'database.js',       content: gen.database_js },
    { id:'package_json', label:'package.json',      content: gen.package_json },
    { id:'env_example',  label:'.env.example',      content: gen.env_example },
  ].filter(f => f.content)

  const irRoutes = ir?.routes || []
  const valEntries = Object.entries(val)

  const tabs = [
    { id:'files',  label:`Generated Files`, count: files.length },
    { id:'routes', label:`Routes`,          count: irRoutes.length },
    { id:'ir',     label:`IR Preview` },
    { id:'val',    label:`Validation`,      count: valEntries.length },
  ]

  if (!pipelineResult) {
    return (
      <div style={{ maxWidth:700, margin:'0 auto', padding:'80px 32px', textAlign:'center' }}>
        <FileCode2 size={48} color="var(--text3)" style={{ margin:'0 auto 16px' }} />
        <h2 style={{ fontFamily:'var(--font-head)', fontSize:22, fontWeight:700, marginBottom:8 }}>No pipeline result yet</h2>
        <p style={{ color:'var(--text2)', fontSize:14, marginBottom:24 }}>Upload and run a migration to see generated code here.</p>
        <button className="btn btn-primary" onClick={() => navigate('/upload')}>Upload a repo <ArrowRight size={14} /></button>
      </div>
    )
  }

  const activeContent = toStr(files.find(f => f.id === activeFile)?.content || files[0]?.content || '')

  const downloadFile = () => {
    const name = files.find(f => f.id === activeFile)?.label || 'output.js'
    const blob = new Blob([activeContent], { type:'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = name; a.click()
    URL.revokeObjectURL(url)
  }

  const [downloading, setDownloading] = useState(false)

  const downloadAll = async () => {
    if (!uploadedRepo?.id) return
    setDownloading(true)
    try {
      const res  = await downloadOutput(uploadedRepo.id)
      const url  = URL.createObjectURL(new Blob([res.data], { type: 'application/zip' }))
      const a    = document.createElement('a')
      const name = (uploadedRepo.original_filename || 'project').replace('.zip', '')
      a.href = url; a.download = name + '-express.zip'; a.click()
      URL.revokeObjectURL(url)
    } catch {
      files.forEach(f => {
        const blob = new Blob([toStr(f.content)], { type: 'text/plain' })
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href = url; a.download = f.label.replace('/', '-'); a.click()
        URL.revokeObjectURL(url)
      })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'36px 32px' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-head)', fontSize:26, fontWeight:700, letterSpacing:'-0.02em', marginBottom:4 }}>
            Pipeline Output
          </h1>
          <p style={{ color:'var(--text2)', fontSize:14 }}>
            Generated Express.js project from{' '}
            <code style={{ background:'var(--bg3)', padding:'2px 8px', borderRadius:5, fontSize:13 }}>
              {uploadedRepo?.original_filename || 'repository'}
            </code>
          </p>
        </div>
        <button className="btn btn-ghost" onClick={downloadAll} style={{ fontSize:13 }}>
          {downloading ? 'Downloading…' : '↓ Download Project ZIP'}
        </button>
      </div>

      {/* Summary pills */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:24 }}>
        {files.length > 0       && <span className="badge badge-blue">{files.length} files generated</span>}
        {irRoutes.length > 0    && <span className="badge badge-green">{irRoutes.length} routes mapped</span>}
        {pData?.metrics?.ir_model_nodes > 0 && <span className="badge badge-gray">{pData.metrics.ir_model_nodes} models</span>}
        {pData?.metrics?.generated_route_loc > 0 && <span className="badge badge-gray">{pData.metrics.generated_route_loc} lines of code</span>}
        {valEntries.every(([,v]) => v?.is_valid) && valEntries.length > 0 && <span className="badge badge-green">✓ All validations passed</span>}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:2, borderBottom:'1px solid var(--border)', marginBottom:20 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding:'9px 18px', border:'none', borderRadius:'8px 8px 0 0',
            background: activeTab === t.id ? 'var(--bg2)' : 'transparent',
            color: activeTab === t.id ? 'var(--text)' : 'var(--text2)',
            fontSize:13, fontWeight:500, cursor:'pointer',
            borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
            display:'flex', alignItems:'center', gap:6,
          }}>
            {t.label}
            {t.count != null && (
              <span style={{ background:'var(--bg3)', borderRadius:10, padding:'1px 7px', fontSize:11, color:'var(--text3)' }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* FILES TAB — code viewer with file sidebar */}
      {activeTab === 'files' && (
        <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:12, minHeight:500 }}>
          {/* File list sidebar */}
          <div className="card" style={{ padding:8, display:'flex', flexDirection:'column', gap:2 }}>
            <p style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em', padding:'4px 8px', marginBottom:4 }}>
              Project Files
            </p>
            {files.map(f => (
              <button key={f.id} onClick={() => setActiveFile(f.id)} style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'7px 10px', borderRadius:7, border:'none', textAlign:'left', cursor:'pointer',
                background: activeFile === f.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: activeFile === f.id ? 'var(--accent3)' : 'var(--text2)',
                fontSize:12, fontWeight: activeFile === f.id ? 500 : 400,
                transition:'all 0.1s',
              }}>
                <FileCode2 size={12} style={{ flexShrink:0 }} />
                {f.label}
              </button>
            ))}
          </div>

          {/* Code viewer */}
          <div className="card" style={{ padding:0, overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', background:'var(--bg3)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
              <span style={{ fontSize:13, fontWeight:500, color:'var(--text2)' }}>
                {files.find(f => f.id === activeFile)?.label}
              </span>
              <div style={{ display:'flex', gap:8 }}>
                <CopyBtn text={activeContent} />
                <button onClick={downloadFile} style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.06)', border:'1px solid var(--border2)', borderRadius:6, padding:'5px 12px', color:'var(--text2)', fontSize:12, cursor:'pointer' }}>
                  ↓ Download
                </button>
              </div>
            </div>
            <pre style={{ padding:24, margin:0, overflow:'auto', flex:1, maxHeight:520, fontFamily:'monospace', fontSize:12.5, lineHeight:1.9, color:'#a9b1d6', background:'var(--bg1)' }}>
              {activeContent || <span style={{ color:'var(--text3)' }}>Empty file.</span>}
            </pre>
          </div>
        </div>
      )}

      {/* ROUTES TAB */}
      {activeTab === 'routes' && (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          {/* Table header */}
          <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 1fr 120px', gap:16, padding:'10px 20px', background:'var(--bg3)', borderBottom:'1px solid var(--border)', fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.05em' }}>
            <span>Method</span><span>Path</span><span>Handler / View</span><span>Namespace</span>
          </div>
          {irRoutes.length > 0 ? irRoutes.map((r, i) => {
            const method = (r.method || r.http_method || r.methods?.[0] || 'GET').toUpperCase()
            const s = METHOD_STYLE[method] || METHOD_STYLE.GET
            return (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'80px 1fr 1fr 120px', gap:16, padding:'12px 20px', alignItems:'center', borderBottom: i < irRoutes.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ padding:'3px 0', borderRadius:5, fontSize:11, fontWeight:700, background:s.bg, color:s.color, textAlign:'center' }}>{method}</span>
                <code style={{ fontSize:13, color:'var(--text)' }}>{r.path || r.url || r.pattern || '/'}</code>
                <span style={{ fontSize:12, color:'var(--text2)' }}>{r.view_name || r.handler || r.callback || '—'}</span>
                <span style={{ fontSize:12, color:'var(--text3)' }}>{r.namespace || r.app_name || '—'}</span>
              </div>
            )
          }) : (
            <div style={{ padding:48, textAlign:'center', color:'var(--text3)', fontSize:14 }}>
              No routes found in IR. Check the IR Preview tab for raw data.
            </div>
          )}
        </div>
      )}

      {/* IR PREVIEW TAB */}
      {activeTab === 'ir' && (
        <div>
          <p style={{ fontSize:13, color:'var(--text2)', marginBottom:12 }}>
            Intermediate Representation — the universal format CodeMorph uses between parsing and code generation.
          </p>
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ display:'flex', justifyContent:'flex-end', padding:'10px 16px', background:'var(--bg3)', borderBottom:'1px solid var(--border)' }}>
              <CopyBtn text={JSON.stringify(ir, null, 2)} />
            </div>
            <pre style={{ padding:24, margin:0, overflow:'auto', maxHeight:560, fontFamily:'monospace', fontSize:12, lineHeight:1.8, color:'#a9b1d6', background:'var(--bg1)' }}>
              {ir ? JSON.stringify(ir, null, 2) : <span style={{ color:'var(--text3)' }}>No IR data available.</span>}
            </pre>
          </div>
        </div>
      )}

      {/* VALIDATION TAB */}
      {activeTab === 'val' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {valEntries.length > 0 ? valEntries.map(([key, v]) => (
            <div key={key} className="card">
              {/* Card header */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom: (v?.errors?.length || v?.warnings?.length) ? 16 : 0 }}>
                {v?.is_valid
                  ? <CheckCircle2 size={18} color="var(--green2)" />
                  : <XCircle     size={18} color="var(--red)" />
                }
                <span style={{ fontWeight:600, fontSize:14, textTransform:'capitalize' }}>{key} validation</span>
                <span className={`badge ${v?.is_valid ? 'badge-green' : 'badge-red'}`} style={{ marginLeft:'auto' }}>
                  {v?.is_valid ? 'Passed' : 'Failed'}
                </span>
              </div>
              {/* Errors */}
              {v?.errors?.map((e, i) => (
                <div key={i} style={{ display:'flex', gap:10, padding:'8px 12px', background:'rgba(239,68,68,0.08)', borderRadius:7, marginBottom:6 }}>
                  <XCircle size={13} color="var(--red)" style={{ flexShrink:0, marginTop:1 }} />
                  <span style={{ fontSize:12.5, color:'#fca5a5' }}>{typeof e === 'string' ? e : JSON.stringify(e)}</span>
                </div>
              ))}
              {/* Warnings */}
              {v?.warnings?.map((w, i) => (
                <div key={i} style={{ display:'flex', gap:10, padding:'8px 12px', background:'rgba(245,158,11,0.08)', borderRadius:7, marginBottom:6 }}>
                  <AlertTriangle size={13} color="var(--orange)" style={{ flexShrink:0, marginTop:1 }} />
                  <span style={{ fontSize:12.5, color:'#fcd34d' }}>{typeof w === 'string' ? w : JSON.stringify(w)}</span>
                </div>
              ))}
              {v?.is_valid && !v?.warnings?.length && (
                <p style={{ fontSize:12.5, color:'var(--green2)', marginTop:4 }}>✓ No issues found</p>
              )}
            </div>
          )) : (
            <div style={{ padding:48, textAlign:'center', color:'var(--text3)', fontSize:14 }}>No validation data available.</div>
          )}
        </div>
      )}

      <div style={{ display:'flex', gap:10, marginTop:24 }}>
        <button className="btn btn-primary" onClick={() => navigate('/metrics')}>View Metrics <ChevronRight size={14} /></button>
        <button className="btn btn-ghost"   onClick={() => navigate('/upload')}>Run another migration</button>
      </div>
    </div>
  )
}