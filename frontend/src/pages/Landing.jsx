import { useNavigate } from 'react-router-dom'
import { Zap, ArrowRight, Code2, GitBranch, BarChart2, Shield } from 'lucide-react'

const features = [
  { icon: Code2,     title: 'Smart Conversion',   desc: 'LLM-powered code translation from any language to any language via Ollama.' },
  { icon: GitBranch, title: 'Full Pipeline',       desc: 'Upload → Parse → IR Build → Generate → Validate in one seamless flow.' },
  { icon: BarChart2, title: 'Live Metrics',        desc: 'Track accuracy, latency, routes converted and validation scores in real time.' },
  { icon: Shield,    title: 'Validated Output',    desc: 'Every generated file is validated before delivery. No surprises.' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      <div className="noise" />

      {/* Glow orbs */}
      <div style={{
        position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)',
        width: 800, height: 800,
        background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, right: -200,
        width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* Navbar */}
      <nav style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 48px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={18} color="white" fill="white" />
          </div>
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 19, letterSpacing: '-0.02em' }}>
            Code<span style={{ color: 'var(--accent2)' }}>Morph</span>
          </span>
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => navigate('/dashboard')}
          style={{ fontSize: 13 }}
        >
          Open App <ArrowRight size={14} />
        </button>
      </nav>

      {/* Hero */}
      <div style={{
        position: 'relative', zIndex: 10,
        maxWidth: 760, margin: '0 auto',
        padding: '100px 32px 80px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '5px 14px', borderRadius: 20,
          background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.25)',
          fontSize: 12, fontWeight: 600, color: 'var(--accent3)',
          letterSpacing: '0.04em', textTransform: 'uppercase',
          marginBottom: 28,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent2)', display: 'inline-block', animation: 'pulse-glow 2s infinite' }} />
          Powered by Universal IR + Ollama
        </div>

        <h1 style={{
          fontFamily: 'var(--font-head)',
          fontSize: 'clamp(42px, 7vw, 72px)',
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: '-0.03em',
          marginBottom: 24,
        }}>
          Migrate backends<br />
          <span style={{
            background: 'linear-gradient(135deg, #818cf8, #a78bfa, #c084fc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>in seconds.</span>
        </h1>

        <p style={{
          fontSize: 18, color: 'var(--text2)', lineHeight: 1.7,
          maxWidth: 520, margin: '0 auto 40px',
          fontWeight: 300,
        }}>
          Upload any Django repository as a ZIP. CodeMorph parses, builds an IR, generates Express.js, and validates — automatically.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            style={{ padding: '13px 28px', fontSize: 15, borderRadius: 12 }}
            onClick={() => navigate('/upload')}
          >
            Start Migration <ArrowRight size={16} />
          </button>
          <button
            className="btn btn-ghost"
            style={{ padding: '13px 28px', fontSize: 15, borderRadius: 12 }}
            onClick={() => navigate('/dashboard')}
          >
            View Dashboard
          </button>
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 48,
          marginTop: 64, paddingTop: 40,
          borderTop: '1px solid var(--border)',
        }}>
          {[
            { val: 'Django → Express', label: 'Migration target' },
            { val: 'Llama3',           label: 'AI model' },
            { val: 'Universal IR',     label: 'Architecture' },
          ].map(({ val, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 20, color: 'var(--text)', marginBottom: 4 }}>{val}</p>
              <p style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{
        position: 'relative', zIndex: 10,
        maxWidth: 1000, margin: '0 auto',
        padding: '0 32px 100px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
      }}>
        {features.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card" style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            transition: 'border-color 0.2s, background 0.2s',
            cursor: 'default',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(99,102,241,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 14,
            }}>
              <Icon size={18} color="var(--accent3)" />
            </div>
            <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{title}</h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
