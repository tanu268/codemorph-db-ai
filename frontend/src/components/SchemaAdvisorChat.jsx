// src/components/SchemaAdvisorChat.jsx
// Floating Oracle AI chat button — fixed bottom-right, slide-in panel
// Visible from anywhere on the Schema Insights page

import { useState, useRef, useEffect } from 'react'
import { oracleApi } from '@/api/oracle'
import { Cpu, Send, User, X, Sparkles } from 'lucide-react'

const SUGGESTIONS = [
  'Which table needs the most indexes?',
  'What are the biggest migration risks?',
  'Which tables are most central?',
  'How to handle BOOLEAN fields in Oracle?',
  'What Oracle 23ai features improve this schema?',
]

export default function SchemaAdvisorChat({ repoId, schema }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  // Set welcome message when schema data arrives
  useEffect(() => {
    const tables = schema?.summary?.total_tables || 0
    const fks = schema?.summary?.total_fk_relationships || 0
    const score = schema?.compatibility_score || 0
    setMessages([{
      role: 'ai',
      text: `**Oracle Select AI ready.**\n\n${tables} tables · ${fks} FK relationships · ${score}/100 compatibility score.\n\nAsk me anything about your Oracle 23ai migration.`,
    }])
  }, [schema?.summary?.total_tables, schema?.compatibility_score])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const buildAnswer = (question) => {
    const q = question.toLowerCase()
    const score = schema?.compatibility_score || 0
    const warnings = schema?.warnings?.length || 0
    const tables = schema?.tables || []

    if (q.includes('index')) {
      const fkTables = tables.filter(t => t.foreign_keys?.length > 0).map(t => t.name)
      return `**Index Recommendations:**\n\nOracle does NOT auto-index FK columns unlike MySQL InnoDB. Tables needing indexes:\n${fkTables.map(t => `• ${t}`).join('\n') || '• None detected'}\n\nDownload the ZIP to get index_recommendations.sql ready to run in Oracle APEX.`
    }
    if (q.includes('risk') || q.includes('migration')) {
      return `**Migration Risk Assessment:**\n\nScore: ${score}/100 · ${warnings} warnings.\n\n${warnings > 0 ? `Main risks:\n• BOOLEAN → NUMBER(1) mapping (${warnings} fields)\n• FK columns need manual indexes` : '✓ No critical blockers found.'}\n\nRecommend testing DDL in Oracle APEX SQL Workshop first.`
    }
    if (q.includes('boolean')) {
      return `**BOOLEAN in Oracle 23ai:**\n\nOracle SQL has no native BOOLEAN (only PL/SQL). CodeMorph maps:\n\nDjango BooleanField → NUMBER(1) CHECK(VALUE IN (0,1))\n\nOracle 23ai introduced native BOOLEAN — update DDL if targeting 23ai specifically.`
    }
    if (q.includes('central') || q.includes('important')) {
      const sorted = [...tables].sort((a, b) => (b.foreign_keys?.length || 0) - (a.foreign_keys?.length || 0))
      const top = sorted.slice(0, 3)
      return `**Most Central Tables:**\n\n${top.map(t => `• ${t.name} — ${t.foreign_keys?.length || 0} FK relationships, ${t.columns?.length || 0} columns`).join('\n')}\n\nMigrate these first — other tables depend on them for FK constraints.`
    }
    if (q.includes('oracle 23') || q.includes('feature')) {
      return `**Oracle 23ai Features for Your Schema:**\n\n• Native JSON columns — already mapped ✓\n• BOOLEAN type — upgrade from NUMBER(1)\n• Vector Search — for product/text similarity\n• Select AI — natural language SQL queries\n• Auto Indexing — Oracle Autonomous DB`
    }
    const tableNames = tables.map(t => t.name).join(', ')
    return `**Oracle Select AI:**\n\nAnalyzing: ${tableNames || 'schema'}\n\nCompatibility: ${score}/100 · ${warnings} warnings.\n\n${warnings > 0 ? `Fix ${warnings} type mapping issues before migration.` : 'Schema is ready for Oracle 23ai migration.'}\n\nUse View Oracle DDL → Download ZIP to get migration-ready SQL files.`
  }

  const send = async (text) => {
    const q = text || input.trim()
    if (!q || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: q }])
    setLoading(true)
    try {
      // Try real AI first, fall back to smart local answers
      const res = await oracleApi.getAIReview(repoId)
      const advisory = res.data?.advisory || ''
      const answer = advisory.length > 80
        ? `**Oracle Select AI:**\n\n${advisory}`
        : buildAnswer(q)
      setMessages(prev => [...prev, { role: 'ai', text: answer }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: buildAnswer(q) }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const renderText = (text) =>
    text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**'))
        return <strong key={i} style={{ color: '#a5b4fc', display: 'block', marginBottom: 4 }}>{line.slice(2, -2)}</strong>
      if (line.startsWith('•'))
        return <div key={i} style={{ paddingLeft: 4, color: '#9ca3af' }}>{line}</div>
      if (line === '')
        return <div key={i} style={{ height: 6 }} />
      return <div key={i}>{line}</div>
    })

  return (
    <>
      <style>{`
        @keyframes bd{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-5px);opacity:1}}
        @keyframes su{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pr{0%{box-shadow:0 0 0 0 rgba(79,70,229,0.5)}70%{box-shadow:0 0 0 12px rgba(79,70,229,0)}100%{box-shadow:0 0 0 0 rgba(79,70,229,0)}}
        .chat-panel{animation:su 0.22s ease}
        .sug-pill:hover{background:rgba(99,102,241,0.25)!important;color:#c7d2fe!important}
      `}</style>

      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Oracle Select AI Advisor"
        style={{
          position: 'fixed', bottom: 32, right: 32, zIndex: 999,
          width: 58, height: 58, borderRadius: '50%',
          background: open ? '#3730a3' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 24px rgba(79,70,229,0.55)',
          animation: open ? 'none' : 'pr 2.5s infinite',
          transition: 'background 0.2s, transform 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {open ? <X size={20} color="white" /> : <Cpu size={22} color="white" />}
      </button>

      {/* AI label badge */}
      {!open && (
        <div style={{
          position: 'fixed', bottom: 84, right: 28, zIndex: 1000,
          background: '#f87171', color: 'white',
          fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
          padding: '2px 6px', borderRadius: 99, pointerEvents: 'none',
        }}>
          SELECT AI
        </div>
      )}

      {/* Chat panel */}
      {open && (
        <div className="chat-panel" style={{
          position: 'fixed', bottom: 104, right: 32, zIndex: 998,
          width: 376, background: '#0d1117',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column',
          maxHeight: 520,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', background: 'rgba(99,102,241,0.1)', borderBottom: '1px solid rgba(99,102,241,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Cpu size={14} color="#818cf8" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#a5b4fc' }}>Oracle Select AI</div>
                <div style={{ fontSize: 10, color: '#4b5563' }}>Schema migration advisor</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: 'rgba(34,197,94,0.15)', color: '#4ade80', fontWeight: 700 }}>LIVE</span>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 2, display: 'flex' }}><X size={14} /></button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 6px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 200, maxHeight: 260 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ fontSize: 9, color: '#374151', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                  {m.role === 'ai' && <Cpu size={8} color="#818cf8" />}
                  {m.role === 'ai' ? 'Oracle Select AI' : 'You'}
                  {m.role === 'user' && <User size={8} color="#6b7280" />}
                </div>
                <div style={{
                  maxWidth: '90%', padding: '9px 12px', fontSize: 12, lineHeight: 1.6,
                  borderRadius: m.role === 'user' ? '10px 10px 3px 10px' : '10px 10px 10px 3px',
                  background: m.role === 'user' ? 'rgba(79,70,229,0.22)' : 'rgba(255,255,255,0.04)',
                  border: m.role === 'user' ? '1px solid rgba(79,70,229,0.28)' : '1px solid rgba(255,255,255,0.06)',
                  color: m.role === 'user' ? '#e0e7ff' : '#9ca3af',
                }}>
                  {renderText(m.text)}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 9, color: '#374151', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 3 }}><Cpu size={8} color="#818cf8" />Oracle Select AI</div>
                <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px 10px 10px 3px', display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8', animation: 'bd 1.2s infinite', animationDelay: `${i*0.2}s` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {SUGGESTIONS.map((s, i) => (
              <button key={i} className="sug-pill" onClick={() => send(s)} disabled={loading}
                style={{ fontSize: 10, padding: '3px 9px', borderRadius: 99, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.18)', color: '#818cf8', cursor: 'pointer', transition: 'all 0.15s' }}>
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ display: 'flex', gap: 7, padding: '9px 10px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.25)' }}>
            <Sparkles size={13} color="#4f46e5" style={{ alignSelf: 'center', flexShrink: 0 }} />
            <input
              style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '7px 11px', fontSize: 12, color: 'white', outline: 'none', fontFamily: 'var(--font)' }}
              placeholder="Ask Oracle AI about your schema..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
            />
            <button onClick={() => send()} disabled={!input.trim() || loading}
              style={{ width: 33, height: 33, borderRadius: 8, background: '#4f46e5', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: (!input.trim() || loading) ? 0.45 : 1, transition: 'all 0.15s', flexShrink: 0 }}>
              <Send size={13} color="white" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}