import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts'
import { Target, Clock, Code2, GitBranch, CheckCircle2, Layers, ArrowRight, Trophy, TrendingUp, Save } from 'lucide-react'
import { useMigration } from '@/context/MigrationContext'
import { saveMetrics } from '@/api'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:8, padding:'8px 12px', fontSize:12 }}>
      <p style={{ color:'var(--text2)', marginBottom:4 }}>{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color:p.color, fontWeight:600 }}>{p.name}: {p.value}</p>)}
    </div>
  )
}

function MetricRow({ label, value, bar, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:13, color:'var(--text2)', width:160, flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:13, fontWeight:600, width:80, flexShrink:0 }}>{value}</span>
      {bar != null && (
        <div style={{ flex:1, background:'var(--bg3)', borderRadius:4, height:6, overflow:'hidden' }}>
          <div style={{ width:`${Math.min(100, bar)}%`, height:'100%', background:color || 'var(--accent)', borderRadius:4, transition:'width 0.6s ease' }} />
        </div>
      )}
    </div>
  )
}

export default function Metrics() {
  const navigate  = useNavigate()
  const { uploadedRepo, pipelineResult, metrics, setMetrics } = useMigration()
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [saveErr, setSaveErr] = useState(null)
  const [tab,     setTab]     = useState('overview')

  const pData    = pipelineResult?.data || pipelineResult
  const pMetrics = pData?.metrics || {}

  const totalRoutes      = pMetrics.total_routes        ?? 0
  const routesConverted  = pMetrics.routes_converted    ?? 0
  const validationPassed = pMetrics.validation_passed   ?? 0
  const executionMs      = pMetrics.execution_ms        ?? 0
  const irRouteNodes     = pMetrics.ir_route_nodes      ?? 0
  const irModelNodes     = pMetrics.ir_model_nodes      ?? 0
  const generatedLoc     = pMetrics.generated_route_loc ?? 0
  const accuracy         = totalRoutes > 0 ? (routesConverted / totalRoutes) * 100 : 0
  const validationRate   = 3 > 0 ? (validationPassed / 3) * 100 : 0

  // Saved experiment overrides
  const dispAccuracy  = metrics?.conversion_accuracy  != null ? Number(metrics.conversion_accuracy)              : accuracy
  const dispLatency   = metrics?.total_execution_ms   != null ? metrics.total_execution_ms / 1000               : executionMs / 1000
  const dispRoutes    = metrics?.total_routes_found   != null ? metrics.total_routes_found                       : totalRoutes
  const dispConverted = metrics?.routes_converted     != null ? metrics.routes_converted                         : routesConverted

  // Trend data (simulated progression — real historical data would come from multiple experiments)
  const trendData = totalRoutes > 0 ? [
    { v:'v1.0', accuracy: Math.max(0, accuracy - 9).toFixed(1), latency: Math.round(executionMs * 1.6), loc: Math.round(generatedLoc * 0.7) },
    { v:'v1.1', accuracy: Math.max(0, accuracy - 5).toFixed(1), latency: Math.round(executionMs * 1.3), loc: Math.round(generatedLoc * 0.85) },
    { v:'v1.2', accuracy: Math.max(0, accuracy - 2).toFixed(1), latency: Math.round(executionMs * 1.1), loc: Math.round(generatedLoc * 0.95) },
    { v:'v1.3', accuracy: accuracy.toFixed(1),                   latency: Math.round(executionMs),       loc: generatedLoc },
  ] : []

  const radarData = [
    { metric:'Accuracy',    value: accuracy },
    { metric:'Conversion',  value: totalRoutes > 0 ? (routesConverted / totalRoutes) * 100 : 0 },
    { metric:'Validation',  value: validationRate },
    { metric:'Coverage',    value: irRouteNodes > 0 ? Math.min(100, (routesConverted / irRouteNodes) * 100) : 0 },
    { metric:'Output',      value: generatedLoc > 0 ? Math.min(100, (generatedLoc / 500) * 100) : 0 },
  ]

  const handleSave = async () => {
    if (!uploadedRepo || !pData) return
    setSaving(true); setSaveErr(null)
    try {
      const res = await saveMetrics(uploadedRepo.id, {
        experiment_name:    'pipeline-auto-v1',
        parser_version:     'v4',
        generator_version:  'v4',
        validator_version:  'v4',
        total_routes_found: totalRoutes,
        routes_converted:   routesConverted,
        validation_passed:  validationPassed,
        total_execution_ms: Math.round(executionMs),
      })
      setMetrics(res.data.data)
      setSaved(true)
    } catch (e) {
      setSaveErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!pipelineResult) {
    return (
      <div style={{ maxWidth:600, margin:'0 auto', padding:'80px 32px', textAlign:'center' }}>
        <TrendingUp size={48} color="var(--text3)" style={{ margin:'0 auto 16px' }} />
        <h2 style={{ fontFamily:'var(--font-head)', fontSize:22, fontWeight:700, marginBottom:8 }}>No metrics yet</h2>
        <p style={{ color:'var(--text2)', fontSize:14, marginBottom:24 }}>Run a migration first to generate performance data.</p>
        <button className="btn btn-primary" onClick={() => navigate('/upload')}>Upload a repo <ArrowRight size={14} /></button>
      </div>
    )
  }

  const tabList = [
    { id:'overview',    label:'Overview' },
    { id:'trends',      label:'Trends' },
    { id:'experiment',  label:'Experiment' },
  ]

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'36px 32px' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-head)', fontSize:26, fontWeight:700, letterSpacing:'-0.02em', marginBottom:4 }}>
            Metrics & Performance
          </h1>
          <p style={{ color:'var(--text2)', fontSize:14 }}>
            Migration quality and performance analytics for{' '}
            <code style={{ background:'var(--bg3)', padding:'2px 8px', borderRadius:5, fontSize:13 }}>
              {uploadedRepo?.original_filename || 'repository'}
            </code>
          </p>
        </div>
        {!saved ? (
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save Experiment'}
          </button>
        ) : (
          <span className="badge badge-green" style={{ padding:'8px 14px', fontSize:13 }}>
            <CheckCircle2 size={13} /> Experiment saved
          </span>
        )}
      </div>

      {saveErr && (
        <div style={{ padding:'10px 16px', borderRadius:10, marginBottom:20, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#f87171', fontSize:13 }}>
          {saveErr}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:2, borderBottom:'1px solid var(--border)', marginBottom:24 }}>
        {tabList.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:'9px 20px', border:'none', borderRadius:'8px 8px 0 0', cursor:'pointer',
            background: tab === t.id ? 'var(--bg2)' : 'transparent',
            color: tab === t.id ? 'var(--text)' : 'var(--text2)',
            fontSize:13, fontWeight:500,
            borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
          }}>{t.label}</button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div>
          {/* Big KPI row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
            {[
              { label:'Accuracy',         value: `${dispAccuracy.toFixed(1)}%`,      sub:'conversion rate',   color:'var(--accent2)',  bar: dispAccuracy },
              { label:'Routes Converted', value: `${dispConverted}/${dispRoutes}`,    sub:'total routes',      color:'var(--green)',    bar: dispRoutes > 0 ? (dispConverted/dispRoutes)*100 : 0 },
              { label:'Validation Score', value: `${validationRate.toFixed(0)}%`,     sub:`${validationPassed}/3 checks`, color:'var(--orange)', bar: validationRate },
              { label:'Execution Time',   value: `${dispLatency.toFixed(2)}s`,        sub:'end-to-end latency', color:'#a78bfa',        bar: null },
            ].map(k => (
              <div key={k.label} className="card" style={{ position:'relative', overflow:'hidden' }}>
                <p style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{k.label}</p>
                <p style={{ fontSize:30, fontWeight:700, fontFamily:'var(--font-head)', color:'var(--text)', lineHeight:1, marginBottom:6 }}>{k.value}</p>
                <p style={{ fontSize:12, color:'var(--text3)', marginBottom: k.bar != null ? 12 : 0 }}>{k.sub}</p>
                {k.bar != null && (
                  <div style={{ height:3, background:'var(--bg3)', borderRadius:2, overflow:'hidden' }}>
                    <div style={{ width:`${Math.min(100,k.bar)}%`, height:'100%', background:k.color, borderRadius:2, transition:'width 0.6s' }} />
                  </div>
                )}
                <div style={{ position:'absolute', top:12, right:12, width:36, height:36, borderRadius:9, background:`${k.color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <TrendingUp size={15} color={k.color} />
                </div>
              </div>
            ))}
          </div>

          {/* Detail table + radar */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:16 }}>
            <div className="card">
              <p style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Full Metrics Breakdown</p>
              <p style={{ fontSize:12, color:'var(--text3)', marginBottom:16 }}>All values from the latest pipeline run</p>
              <MetricRow label="Total routes found"    value={totalRoutes}      bar={totalRoutes}         color="var(--accent2)" />
              <MetricRow label="Routes converted"      value={routesConverted}  bar={totalRoutes > 0 ? (routesConverted/totalRoutes)*100 : 0} color="var(--green)" />
              <MetricRow label="Conversion accuracy"   value={`${accuracy.toFixed(2)}%`} bar={accuracy} color="var(--accent)" />
              <MetricRow label="IR route nodes"        value={irRouteNodes}     bar={null} />
              <MetricRow label="IR model nodes"        value={irModelNodes}     bar={null} />
              <MetricRow label="Generated LOC"         value={generatedLoc}     bar={Math.min(100,(generatedLoc/1000)*100)} color="#a78bfa" />
              <MetricRow label="Validation checks"     value={`${validationPassed}/3`} bar={validationRate} color="var(--orange)" />
              <MetricRow label="Execution time"        value={`${(executionMs/1000).toFixed(3)}s`} bar={null} />
            </div>

            <div className="card">
              <p style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Quality Radar</p>
              <p style={{ fontSize:12, color:'var(--text3)', marginBottom:8 }}>Multi-dimensional score</p>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill:'var(--text3)', fontSize:10 }} />
                  <Radar dataKey="value" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TRENDS TAB */}
      {tab === 'trends' && (
        <div>
          <p style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>
            Simulated progression across parser versions based on current run. Save multiple experiments to build real historical data.
          </p>
          {trendData.length > 0 ? (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div className="card">
                <p style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Conversion Accuracy</p>
                <p style={{ fontSize:12, color:'var(--text3)', marginBottom:16 }}>% of routes successfully converted</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={trendData} barSize={32}>
                    <XAxis dataKey="v" tick={{ fill:'var(--text3)', fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[Math.max(0,accuracy-15), 100]} tick={{ fill:'var(--text3)', fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="accuracy" name="Accuracy %" radius={[4,4,0,0]}>
                      {trendData.map((_, i) => <Cell key={i} fill={i === trendData.length-1 ? 'var(--accent)' : 'rgba(99,102,241,0.35)'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <p style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Execution Latency</p>
                <p style={{ fontSize:12, color:'var(--text3)', marginBottom:16 }}>End-to-end pipeline time in ms</p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={trendData}>
                    <XAxis dataKey="v" tick={{ fill:'var(--text3)', fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:'var(--text3)', fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line dataKey="latency" name="Latency ms" stroke="var(--green2)" strokeWidth={2.5} dot={{ fill:'var(--green2)', r:4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <p style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Lines of Code Generated</p>
                <p style={{ fontSize:12, color:'var(--text3)', marginBottom:16 }}>Total LOC in generated project</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={trendData} barSize={32}>
                    <XAxis dataKey="v" tick={{ fill:'var(--text3)', fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:'var(--text3)', fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="loc" name="LOC" radius={[4,4,0,0]}>
                      {trendData.map((_, i) => <Cell key={i} fill={i === trendData.length-1 ? '#a78bfa' : 'rgba(167,139,250,0.35)'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card" style={{ display:'flex', flexDirection:'column', justifyContent:'center' }}>
                <p style={{ fontSize:13, fontWeight:600, marginBottom:16 }}>Version Comparison</p>
                {trendData.map((d, i) => (
                  <div key={d.v} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                    <span style={{ fontSize:12, fontFamily:'monospace', background:'var(--bg3)', padding:'2px 8px', borderRadius:5, minWidth:40, textAlign:'center', border: i === trendData.length-1 ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--border)' }}>{d.v}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text3)', marginBottom:3 }}>
                        <span>Accuracy</span><span>{d.accuracy}%</span>
                      </div>
                      <div style={{ height:4, background:'var(--bg3)', borderRadius:2, overflow:'hidden' }}>
                        <div style={{ width:`${d.accuracy}%`, height:'100%', background: i === trendData.length-1 ? 'var(--accent)' : 'rgba(99,102,241,0.4)', borderRadius:2 }} />
                      </div>
                    </div>
                    {i === trendData.length-1 && <span className="badge badge-blue" style={{ fontSize:10 }}>latest</span>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:48, color:'var(--text3)' }}>Run a migration to see trend data.</div>
          )}
        </div>
      )}

      {/* EXPERIMENT TAB */}
      {tab === 'experiment' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div className="card">
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
              <Trophy size={16} color="var(--orange)" />
              <p style={{ fontSize:14, fontWeight:600 }}>Current Run</p>
              <span className="badge badge-blue" style={{ marginLeft:'auto' }}>pipeline-auto-v1</span>
            </div>
            {[
              ['Parser version',     'v4'],
              ['Generator version',  'v4'],
              ['Validator version',  'v4'],
              ['Total routes',       totalRoutes],
              ['Converted',          routesConverted],
              ['Accuracy',           `${accuracy.toFixed(2)}%`],
              ['Validation passed',  `${validationPassed}/3`],
              ['Execution time',     `${(executionMs/1000).toFixed(3)}s`],
              ['IR route nodes',     irRouteNodes],
              ['IR model nodes',     irModelNodes],
              ['Generated LOC',      generatedLoc],
            ].map(([k, v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
                <span style={{ color:'var(--text2)' }}>{k}</span>
                <span style={{ fontWeight:500 }}>{v ?? '—'}</span>
              </div>
            ))}
            {!saved && (
              <button className="btn btn-primary" style={{ marginTop:16, width:'100%', justifyContent:'center' }} onClick={handleSave} disabled={saving}>
                <Save size={14} /> {saving ? 'Saving…' : 'Save this experiment'}
              </button>
            )}
          </div>

          <div className="card">
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
              <CheckCircle2 size={16} color="var(--green2)" />
              <p style={{ fontSize:14, fontWeight:600 }}>Saved Experiment</p>
            </div>
            {metrics ? [
              ['Experiment name',     metrics.experiment_name],
              ['Parser version',      metrics.parser_version],
              ['Generator version',   metrics.generator_version],
              ['Validator version',   metrics.validator_version],
              ['Accuracy',            `${Number(metrics.conversion_accuracy).toFixed(2)}%`],
              ['Total routes',        metrics.total_routes_found],
              ['Converted',           metrics.routes_converted],
              ['Validation passed',   metrics.validation_passed],
              ['Execution time',      `${(metrics.total_execution_ms/1000).toFixed(2)}s`],
            ].map(([k, v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
                <span style={{ color:'var(--text2)' }}>{k}</span>
                <span style={{ fontWeight:500 }}>{v ?? '—'}</span>
              </div>
            )) : (
              <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text3)', fontSize:14 }}>
                No experiment saved yet.<br />
                <span style={{ fontSize:12, marginTop:6, display:'block' }}>Save the current run from the left panel.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}