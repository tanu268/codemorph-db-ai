// src/pages/SchemaInsights.jsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as d3 from 'd3'
import { useMigration } from '@/context/MigrationContext'
import { oracleApi } from '@/api/oracle'
import {
  Database, GitBranch, Layers, AlertTriangle,
  ChevronDown, ChevronRight, Table2, Key, Link2,
  Shield, Cpu, ArrowRight
} from 'lucide-react'
import SchemaAdvisorChat from '@/components/SchemaAdvisorChat'

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg)',
    padding: '40px 48px',
    fontFamily: 'var(--font)',
  },
  header: {
    display: 'flex', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 36,
  },
  title: {
    fontSize: 28, fontWeight: 700,
    fontFamily: 'var(--font-head)',
    letterSpacing: '-0.02em',
    color: 'var(--text)',
    marginBottom: 6,
  },
  subtitle: { fontSize: 14, color: 'var(--text3)' },
  oracleBadge: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 16px', borderRadius: 10,
    background: 'rgba(220,38,38,0.1)',
    border: '1px solid rgba(220,38,38,0.25)',
    fontSize: 12, fontWeight: 600, color: '#f87171',
  },
  grid4: {
    display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
    gap: 16, marginBottom: 28,
  },
  card: {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: 12, padding: '18px 20px',
  },
  cardLabel: { fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 },
  cardValue: { fontSize: 28, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-head)' },
  cardSub: { fontSize: 12, color: 'var(--text3)', marginTop: 4 },
  scoreRing: {
    width: 56, height: 56, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 15, fontWeight: 700,
    border: '3px solid',
    marginBottom: 8,
  },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 },
  sectionTitle: {
    fontSize: 14, fontWeight: 600, color: 'var(--text)',
    marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
  },
  graphBox: {
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 12, padding: 20, height: 340,
    display: 'flex', flexDirection: 'column',
  },
  warningBox: {
    background: 'rgba(245,158,11,0.08)',
    border: '1px solid rgba(245,158,11,0.2)',
    borderRadius: 12, padding: 20,
  },
  warningItem: {
    display: 'flex', gap: 10, padding: '8px 0',
    borderBottom: '1px solid rgba(245,158,11,0.1)',
    fontSize: 12, color: 'var(--text2)', lineHeight: 1.5,
  },
  tableAccordion: {
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 12, overflow: 'hidden', marginBottom: 28,
  },
  tableRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 20px', cursor: 'pointer',
    borderBottom: '1px solid var(--border)',
    transition: 'background 0.15s',
  },
  colRow: {
    display: 'grid', gridTemplateColumns: '180px 1fr 140px 80px',
    padding: '8px 20px 8px 44px',
    fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.04)',
    color: 'var(--text2)',
  },
  colHeader: {
    display: 'grid', gridTemplateColumns: '180px 1fr 140px 80px',
    padding: '8px 20px 8px 44px',
    fontSize: 11, color: 'var(--text3)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    background: 'rgba(255,255,255,0.02)',
    borderBottom: '1px solid var(--border)',
  },
  badge: (color) => ({
    display: 'inline-flex', padding: '2px 8px',
    borderRadius: 6, fontSize: 10, fontWeight: 600,
    background: `rgba(${color},0.15)`, color: `rgb(${color})`,
  }),
  emptyState: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    height: 300, gap: 16, color: 'var(--text3)',
  },
  btn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 20px', borderRadius: 10,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    border: 'none', transition: 'all 0.15s',
  },
}

// ── D3 Force Graph ─────────────────────────────────────────────────────────────

function RelationshipGraph({ tables, edges }) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || !tables.length) return

    const W = containerRef.current.clientWidth || 600
    const H = 280

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', W)
      .attr('height', H)

    // Arrow marker
    svg.append('defs').append('marker')
      .attr('id', 'arr').attr('viewBox', '0 0 10 10')
      .attr('refX', 24).attr('refY', 5)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto-start-reverse')
      .append('path').attr('d', 'M2 1L8 5L2 9')
      .attr('fill', 'none').attr('stroke', '#7c3aed').attr('stroke-width', 1.5)

    const nodes = tables.map(t => ({
      id: t.table_name,
      name: t.name,
      cols: t.columns.length,
      fks: t.foreign_keys ? t.foreign_keys.length : 0,
    }))

    const links = edges
      .filter(e => e.type !== 'ManyToManyField')
      .map(e => ({ source: e.from, target: e.to, label: e.label }))

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-320))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(42))

    // Links
    const link = svg.append('g').selectAll('line')
      .data(links).join('line')
      .attr('stroke', '#4f46e5')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.5)
      .attr('marker-end', 'url(#arr)')

    // Link labels
    const linkLabel = svg.append('g').selectAll('text')
      .data(links).join('text')
      .attr('font-size', 9)
      .attr('fill', '#6b7280')
      .attr('text-anchor', 'middle')
      .text(d => d.label || '')

    // Node groups
    const node = svg.append('g').selectAll('g')
      .data(nodes).join('g')
      .attr('cursor', 'pointer')
      .call(
        d3.drag()
          .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
          .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y })
          .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      )

    // Node circle — size by column count
    node.append('circle')
      .attr('r', d => Math.max(24, 18 + d.cols * 1.2))
      .attr('fill', d => d.fks > 0 ? 'rgba(79,70,229,0.2)' : 'rgba(124,58,237,0.15)')
      .attr('stroke', d => d.fks > 0 ? '#4f46e5' : '#7c3aed')
      .attr('stroke-width', 1.8)

    // Node name
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.2em')
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('fill', '#a5b4fc')
      .text(d => d.name.length > 9 ? d.name.slice(0, 8) + '…' : d.name)

    // Col count
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.7em')
      .attr('font-size', 9)
      .attr('fill', '#6b7280')
      .text(d => `${d.cols} cols`)

    sim.on('tick', () => {
      // Clamp nodes within bounds
      nodes.forEach(d => {
        d.x = Math.max(30, Math.min(W - 30, d.x))
        d.y = Math.max(30, Math.min(H - 30, d.y))
      })
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      linkLabel
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2 - 4)
      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => sim.stop()
  }, [tables, edges])

  if (!tables.length) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13 }}>
      No tables found
    </div>
  )

  return (
    <div ref={containerRef} style={{ width: '100%', height: 280, overflow: 'hidden' }}>
      <svg ref={svgRef} style={{ width: '100%', height: 280 }} />
    </div>
  )
}

// ── Score ring color ───────────────────────────────────────────────────────────
function scoreColor(s) {
  if (s >= 85) return { border: '#22c55e', color: '#4ade80' }
  if (s >= 65) return { border: '#f59e0b', color: '#fbbf24' }
  return { border: '#ef4444', color: '#f87171' }
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SchemaInsights() {
  const { uploadedRepo } = useMigration()
  const navigate = useNavigate()
  const [schema, setSchema] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [openTable, setOpenTable] = useState(null)

  const repoId = uploadedRepo?.id

  useEffect(() => {
    if (!repoId) return
    setLoading(true)
    oracleApi.analyzeSchema(repoId)
      .then(r => setSchema(r.data.schema))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [repoId])

  if (!repoId) return (
    <div style={S.page}>
      <div style={S.emptyState}>
        <Database size={40} color="#4f46e5" />
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text2)' }}>No repository loaded</div>
        <div style={{ fontSize: 13 }}>Upload a Django project first</div>
        <button style={{ ...S.btn, background: '#4f46e5', color: '#fff' }} onClick={() => navigate('/upload')}>
          Go to Upload <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )

  if (loading) return (
    <div style={S.page}>
      <div style={S.emptyState}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #4f46e5', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontSize: 14, color: 'var(--text3)' }}>Analyzing schema with Oracle AI...</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error) return (
    <div style={S.page}>
      <div style={S.emptyState}>
        <AlertTriangle size={36} color="#ef4444" />
        <div style={{ color: '#f87171', fontSize: 14 }}>{error}</div>
      </div>
    </div>
  )

  const summary = schema?.summary || {}
  const tables = schema?.tables || []
  const edges = schema?.relationship_edges || []
  const warnings = schema?.warnings || []
  const score = schema?.compatibility_score ?? 0
  const sc = scoreColor(score)

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.title}>Schema Insights</div>
          <div style={S.subtitle}>
            Oracle 23ai compatibility analysis · {uploadedRepo?.original_filename}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={S.oracleBadge}>
            <Shield size={12} /> Oracle AI Database
          </div>
          <button
            style={{ ...S.btn, background: '#4f46e5', color: '#fff', fontSize: 12 }}
            onClick={() => navigate('/sql-preview')}
          >
            <Cpu size={13} /> View Oracle DDL
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div style={S.grid4}>
        <div style={S.card}>
          <div style={S.cardLabel}>Tables</div>
          <div style={S.cardValue}>{summary.total_tables ?? 0}</div>
          <div style={S.cardSub}>Django models detected</div>
        </div>
        <div style={S.card}>
          <div style={S.cardLabel}>Columns</div>
          <div style={S.cardValue}>{summary.total_columns ?? 0}</div>
          <div style={S.cardSub}>Total fields mapped</div>
        </div>
        <div style={S.card}>
          <div style={S.cardLabel}>Relationships</div>
          <div style={{ ...S.cardValue, color: '#818cf8' }}>{summary.total_fk_relationships ?? 0}</div>
          <div style={S.cardSub}>FK + M2M edges</div>
        </div>
        <div style={S.card}>
          <div style={S.cardLabel}>Oracle Compatibility</div>
          <div style={{ ...S.scoreRing, borderColor: sc.border, color: sc.color }}>
            {score}
          </div>
          <div style={S.cardSub}>
            {score >= 85 ? 'Migration ready' : score >= 65 ? 'Minor fixes needed' : 'Review warnings'}
          </div>
        </div>
      </div>

      {/* Graph + Warnings */}
      <div style={S.row2}>
        <div style={S.graphBox}>
          <div style={S.sectionTitle}>
            <GitBranch size={14} color="#4f46e5" />
            Table relationship graph
            <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>drag nodes to explore</span>
          </div>
          <RelationshipGraph tables={tables} edges={edges} />
        </div>

        <div style={S.warningBox}>
          <div style={S.sectionTitle}>
            <AlertTriangle size={14} color="#f59e0b" />
            Oracle migration warnings
            <span style={{ ...S.badge('245,158,11'), marginLeft: 4 }}>{warnings.length}</span>
          </div>
          {warnings.length === 0 ? (
            <div style={{ fontSize: 13, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 8 }}>
              ✓ No warnings — schema is Oracle 23ai compatible
            </div>
          ) : (
            warnings.map((w, i) => (
              <div key={i} style={{ ...S.warningItem, borderBottom: i === warnings.length - 1 ? 'none' : undefined }}>
                <AlertTriangle size={12} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                {w}
              </div>
            ))
          )}

          {/* Oracle tech tags */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(245,158,11,0.15)' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Oracle technologies detected
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Oracle 23ai DDL', 'Select AI', 'Vector Search', 'APEX Export', 'Auto Indexing'].map(t => (
                <span key={t} style={{ ...S.badge('99,102,241'), padding: '3px 10px', fontSize: 11 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Table accordion */}
      <div style={S.sectionTitle}>
        <Layers size={14} color="#4f46e5" />
        Table details — Oracle DDL preview
      </div>
      <div style={S.tableAccordion}>
        {tables.map((table, ti) => (
          <div key={table.table_name}>
            <div
              style={{
                ...S.tableRow,
                background: openTable === ti ? 'rgba(79,70,229,0.07)' : 'transparent',
              }}
              onClick={() => setOpenTable(openTable === ti ? null : ti)}
              onMouseEnter={e => { if (openTable !== ti) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              onMouseLeave={e => { if (openTable !== ti) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {openTable === ti
                  ? <ChevronDown size={14} color="#818cf8" />
                  : <ChevronRight size={14} color="var(--text3)" />
                }
                <Table2 size={14} color="#4f46e5" />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                  {table.name}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>→ {table.table_name.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ ...S.badge('99,102,241') }}>{table.columns.length} cols</span>
                {table.foreign_keys.length > 0 && (
                  <span style={{ ...S.badge('79,70,229'), display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Link2 size={9} /> {table.foreign_keys.length} FK
                  </span>
                )}
                {table.indexes.length > 0 && (
                  <span style={{ ...S.badge('16,185,129') }}>{table.indexes.length} idx</span>
                )}
              </div>
            </div>

            {openTable === ti && (
              <>
                <div style={S.colHeader}>
                  <span>Column</span><span>Oracle Type</span><span>Django Type</span><span>Flags</span>
                </div>
                {table.columns.map((col, ci) => (
                  <div key={ci} style={{
                    ...S.colRow,
                    background: ci % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  }}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: col.is_primary_key ? '#fbbf24' : 'var(--text)' }}>
                      {col.is_primary_key && <Key size={9} color="#fbbf24" style={{ marginRight: 4 }} />}
                      {col.name}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#818cf8' }}>
                      {col.oracle_type}
                    </span>
                    <span style={{ color: 'var(--text3)', fontSize: 11 }}>{col.django_type}</span>
                    <span style={{ display: 'flex', gap: 4 }}>
                      {col.is_nullable && <span style={S.badge('107,114,128')}>null</span>}
                      {col.is_unique && <span style={S.badge('245,158,11')}>uniq</span>}
                    </span>
                  </div>
                ))}
                {table.foreign_keys.length > 0 && (
                  <div style={{ padding: '10px 20px 10px 44px', background: 'rgba(79,70,229,0.05)', borderTop: '1px solid rgba(79,70,229,0.1)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>FK Constraints</div>
                    {table.foreign_keys.map((fk, fi) => (
                      <div key={fi} style={{ fontSize: 11, color: '#818cf8', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>
                        {fk.from_column} → {fk.to_table.toUpperCase()}(ID) ON DELETE {fk.on_delete}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      <SchemaAdvisorChat repoId={repoId} schema={schema} />
    </div>
  )
}