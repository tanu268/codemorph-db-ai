import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Zap, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import GoogleBtn from '@/components/GoogleBtn'

export default function Login() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { login } = useAuth()
  const from      = location.state?.from?.pathname || '/'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [show,     setShow]     = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px', position: 'relative',
    }}>
      <div className="noise" />

      {/* Background glow */}
      <div style={{ position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)', width:600, height:600, background:'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 65%)', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:420, position:'relative', zIndex:1 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <Link to="/" style={{ display:'inline-flex', alignItems:'center', gap:10, textDecoration:'none' }}>
            <div style={{ width:40, height:40, background:'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Zap size={20} color="white" fill="white" />
            </div>
            <span style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:20, letterSpacing:'-0.02em' }}>
              Code<span style={{ color:'var(--accent2)' }}>Morph</span>
            </span>
          </Link>
          <p style={{ marginTop:20, fontSize:22, fontWeight:700, fontFamily:'var(--font-head)', letterSpacing:'-0.02em' }}>
            Welcome back
          </p>
          <p style={{ color:'var(--text2)', fontSize:14, marginTop:6 }}>
            Sign in to your account to continue
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:18 }}>

          {/* Google button */}
          <GoogleBtn onSuccess={() => navigate(from, { replace: true })} />

          {/* Divider */}
          <div style={{ display:'flex', alignItems:'center', gap:12, margin:'20px 0' }}>
            <div style={{ flex:1, height:1, background:'var(--border)' }} />
            <span style={{ fontSize:12, color:'var(--text3)' }}>or continue with email</span>
            <div style={{ flex:1, height:1, background:'var(--border)' }} />
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding:'10px 14px', borderRadius:9, marginBottom:16, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', color:'#f87171', fontSize:13 }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:13, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:6 }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required
                style={{ borderRadius:10 }}
              />
            </div>

            <div style={{ marginBottom:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <label style={{ fontSize:13, fontWeight:500, color:'var(--text2)' }}>Password</label>
                <Link to="/forgot-password" style={{ fontSize:12, color:'var(--accent3)' }}>Forgot password?</Link>
              </div>
              <div style={{ position:'relative' }}>
                <input
                  type={show ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  style={{ borderRadius:10, paddingRight:44 }}
                />
                <button type="button" onClick={() => setShow(!show)} style={{
                  position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', color:'var(--text3)', cursor:'pointer', padding:4,
                }}>
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ width:'100%', justifyContent:'center', padding:'12px', fontSize:14, borderRadius:11, opacity: loading ? 0.7 : 1 }}>
              {loading
                ? <><Loader2 size={15} className="spinner" /> Signing in…</>
                : <>Sign in <ArrowRight size={14} /></>
              }
            </button>
          </form>
        </div>

        <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'var(--text3)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color:'var(--accent3)', fontWeight:500 }}>Create one</Link>
        </p>
      </div>
    </div>
  )
}