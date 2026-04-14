// src/pages/SQLPreview.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMigration } from '@/context/MigrationContext'
import { oracleApi } from '@/api/oracle'
import {
  Download, Copy, Check, AlertTriangle,
  Database, FileCode, Shield, ArrowLeft, ChevronRight
} from 'lucide-react'

// ── Minimal SQL syntax highlighter ───────────────────────────────────────────
function highlightSQL(code) {
  const keywords = ['CREATE','TABLE','ALTER','ADD','CONSTRAINT','FOREIGN','KEY','REFERENCES',
    'PRIMARY','NOT','NULL','UNIQUE','CHECK','INDEX','ON','DELETE','CASCADE','SET',
    'GENERATED','ALWAYS','AS','IDENTITY','DEFAULT','INSERT','INTO','VALUES']
  const types = ['NUMBER','VARCHAR2','CLOB','DATE','TIMESTAMP','INTERVAL','JSON',
    'BINARY_DOUBLE','CHAR','DAY','SECOND']

  return code.split('\n').map((line, i) => {
    if (line.trim().startsWith('--')) {
      return <div key={i} style={{ color: '#6b7280', fontStyle: 'italic' }}>{line}</div>
    }
    const tokens = line.split(/(\s+|[(),;])/g)
    return (
      <div key={i}>
        {tokens.map((tok, j) => {
          const upper = tok.trim().toUpperCase()
          if (keywords.includes(upper))
            return <span key={j} style={{ color: '#818cf8', fontWeight: 600 }}>{tok}</span>
          if (types.includes(upper))
            return <span key={j} style={{ color: '#34d399' }}>{tok}</span>
          if (tok === '(' || tok === ')' || tok === ',' || tok === ';')
            return <span key={j} style={{ color: '#f59e0b' }}>{tok}</span>
          if (/^[A-Z_][A-Z0-9_]*$/.test(tok.trim()) && tok.trim().length > 2)
            return <span key={j} style={{ color: '#e2e8f0' }}>{tok}</span>
          return <span key={j} style={{ color: '#9ca3af' }}>{tok}</span>
        })}
      </div>
    )
  })
}

const S = {
  page: { minHeight: '100vh', background: 'var(--bg)', padding: '40px 48px' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-head)', letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 6 },
  subtitle: { fontSize: 14, color: 'var(--text3)' },
  layout: { display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'start' },
  sidebar: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, position: 'sticky', top: 80 },
  sideLabel: { fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 },
  tableItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 10px', borderRadius: 8, fontSize: 12,
    color: 'var(--text2)', cursor: 'pointer', transition: 'all 0.1s',
    fontFamily: 'var(--font-mono)',
  },
  editorBox: { background: '#0d1117', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' },
  editorHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 20px', background: 'rgba(255,255,255,0.03)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  editorBody: {
    padding: '20px 24px', overflowX: 'auto',
    fontFamily: 'var(--font-mono)', fontSize: 12.5,
    lineHeight: 1.7, maxHeight: 560, overflowY: 'auto',
  },
  btn: {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '8px 16px', borderRadius: 9,
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: '1px solid var(--border)', transition: 'all 0.15s',
  },
  metaCard: {
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '14px 18px',
    display: 'flex', alignItems: 'center', gap: 12,
    marginBottom: 12,
  },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 16, color: 'var(--text3)' },
}

export default function SQLPreview() {
  const { uploadedRepo } = useMigration()
  const navigate = useNavigate()
  const [ddlData, setDdlData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const repoId = uploadedRepo?.id

  useEffect(() => {
    if (!repoId) return
    setLoading(true)
    oracleApi.getDDL(repoId)
      .then(r => setDdlData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [repoId])

  const handleCopy = () => {
    navigator.clipboard.writeText(ddlData?.ddl || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = async () => {
    if (!repoId) return
    setDownloading(true)
    try {
      const res = await oracleApi.exportZip(repoId)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `oracle_migration_${repoId}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) { console.error(e) }
    finally { setDownloading(false) }
  }

  if (!repoId) return (
    <div style={S.page}>
      <div style={S.emptyState}>
        <Database size={40} color="#4f46e5" />
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text2)' }}>No repository loaded</div>
        <button style={{ ...S.btn, background: '#4f46e5', color: '#fff', border: 'none' }} onClick={() => navigate('/upload')}>
          Go to Upload
        </button>
      </div>
    </div>
  )

  const score = ddlData?.compatibility_score ?? 0
  const scoreColor = score >= 85 ? '#4ade80' : score >= 65 ? '#fbbf24' : '#f87171'

  // Extract table names from DDL for sidebar
  const tableNames = ddlData?.ddl
    ? [...ddlData.ddl.matchAll(/CREATE TABLE (\w+)/g)].map(m => m[1])
    : []

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <button
            style={{ ...S.btn, background: 'transparent', color: 'var(--text3)', marginBottom: 12, padding: '4px 8px' }}
            onClick={() => navigate('/schema-insights')}
          >
            <ArrowLeft size={12} /> Schema Insights
          </button>
          <div style={S.title}>Oracle DDL Preview</div>
          <div style={S.subtitle}>
            Generated Oracle 23ai CREATE TABLE statements · {uploadedRepo?.original_filename}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ ...S.btn, background: 'rgba(255,255,255,0.05)', color: 'var(--text2)' }} onClick={handleCopy}>
            {copied ? <Check size={13} color="#4ade80" /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy DDL'}
          </button>
          <button
            style={{ ...S.btn, background: '#4f46e5', color: '#fff', border: 'none', opacity: downloading ? 0.7 : 1 }}
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download size={13} />
            {downloading ? 'Preparing...' : 'Download ZIP'}
          </button>
        </div>
      </div>

      {/* Meta cards row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        <div style={S.metaCard}>
          <Database size={18} color="#4f46e5" />
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Tables</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{ddlData?.table_count ?? '—'}</div>
          </div>
        </div>
        <div style={S.metaCard}>
          <Shield size={18} color={scoreColor} />
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Compatibility</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: scoreColor }}>{score}/100</div>
          </div>
        </div>
        <div style={S.metaCard}>
          <AlertTriangle size={18} color="#f59e0b" />
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Warnings</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{ddlData?.warnings?.length ?? 0}</div>
          </div>
        </div>
        <div style={S.metaCard}>
          <FileCode size={18} color="#34d399" />
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>DDL Lines</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
              {ddlData?.ddl ? ddlData.ddl.split('\n').length : '—'}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={S.emptyState}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #4f46e5', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <div style={{ fontSize: 13 }}>Generating Oracle 23ai DDL...</div>
        </div>
      ) : (
        <div style={S.layout}>
          {/* Sidebar — table list */}
          <div style={S.sidebar}>
            <div style={S.sideLabel}>Tables in DDL</div>
            {tableNames.map(name => (
              <div
                key={name}
                style={S.tableItem}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(79,70,229,0.12)'; e.currentTarget.style.color = '#a5b4fc' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)' }}
                onClick={() => {
                  document.getElementById(`tbl-${name}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }}
              >
                <ChevronRight size={10} />{name}
              </div>
            ))}

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div style={S.sideLabel}>ZIP contains</div>
              {['oracle_ddl.sql', 'index_recommendations.sql', 'migration_notes.md'].map(f => (
                <div key={f} style={{ fontSize: 11, color: 'var(--text3)', padding: '4px 0', fontFamily: 'var(--font-mono)' }}>
                  📄 {f}
                </div>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div style={S.editorBox}>
            <div style={S.editorHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 8, fontFamily: 'var(--font-mono)' }}>
                  oracle_ddl.sql
                </span>
              </div>
              <span style={{ fontSize: 11, color: '#4f46e5', fontWeight: 600 }}>
                Oracle Database 23ai
              </span>
            </div>
            <div style={S.editorBody}>
              {ddlData?.ddl
                ? highlightSQL(ddlData.ddl)
                : <span style={{ color: '#6b7280' }}>No DDL generated yet</span>
              }
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {ddlData?.warnings?.length > 0 && (
        <div style={{ marginTop: 20, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#fbbf24', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
            <AlertTriangle size={13} /> Migration warnings
          </div>
          {ddlData.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--text3)', padding: '4px 0', borderBottom: i < ddlData.warnings.length - 1 ? '1px solid rgba(245,158,11,0.1)' : 'none' }}>
              · {w}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}