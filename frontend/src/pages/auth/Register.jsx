import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, Eye, EyeOff, ArrowRight, Loader2, Check } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import GoogleBtn from '@/components/GoogleBtn'

const rules = [
  { test: p => p.length >= 8,          label: 'At least 8 characters' },
  { test: p => /[A-Z]/.test(p),        label: 'One uppercase letter' },
  { test: p => /[0-9]/.test(p),        label: 'One number' },
]

export default function Register() {
  const navigate    = useNavigate()
  const { register } = useAuth()

  const [username, setUsername] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [show,     setShow]     = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  const strength = rules.filter(r => r.test(password)).length

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (strength < 2) { setError('Password is too weak.'); return }
    setError(null); setLoading(true)
    try {
      await register(username, email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight:'100vh', background:'var(--bg)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'32px 16px', position:'relative',
    }}>
      <div className="noise" />
      <div style={{ position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)', width:600, height:600, background:'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 65%)', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:440, position:'relative', zIndex:1 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <Link to="/" style={{ display:'inline-flex', alignItems:'center', gap:10 }}>
            <div style={{ width:40, height:40, background:'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Zap size={20} color="white" fill="white" />
            </div>
            <span style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:20, letterSpacing:'-0.02em' }}>
              Code<span style={{ color:'var(--accent2)' }}>Morph</span>
            </span>
          </Link>
          <p style={{ marginTop:20, fontSize:22, fontWeight:700, fontFamily:'var(--font-head)', letterSpacing:'-0.02em' }}>Create your account</p>
          <p style={{ color:'var(--text2)', fontSize:14, marginTop:6 }}>Start migrating Django projects in seconds</p>
        </div>

        <div className="card" style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:18 }}>

          <GoogleBtn label="Sign up with Google" onSuccess={() => navigate('/', { replace: true })} />

          <div style={{ display:'flex', alignItems:'center', gap:12, margin:'20px 0' }}>
            <div style={{ flex:1, height:1, background:'var(--border)' }} />
            <span style={{ fontSize:12, color:'var(--text3)' }}>or sign up with email</span>
            <div style={{ flex:1, height:1, background:'var(--border)' }} />
          </div>

          {error && (
            <div style={{ padding:'10px 14px', borderRadius:9, marginBottom:16, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', color:'#f87171', fontSize:13 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:13, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:6 }}>Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="yourname" required style={{ borderRadius:10 }} />
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:13, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={{ borderRadius:10 }} />
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:13, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:6 }}>Password</label>
              <div style={{ position:'relative' }}>
                <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={{ borderRadius:10, paddingRight:44 }} />
                <button type="button" onClick={() => setShow(!show)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text3)', cursor:'pointer', padding:4 }}>
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* Strength bar */}
              {password && (
                <div style={{ marginTop:8 }}>
                  <div style={{ display:'flex', gap:4, marginBottom:6 }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{ flex:1, height:3, borderRadius:2, background: i < strength ? (strength === 1 ? 'var(--red)' : strength === 2 ? 'var(--orange)' : 'var(--green)') : 'var(--bg3)', transition:'background 0.2s' }} />
                    ))}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                    {rules.map(r => (
                      <div key={r.label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color: r.test(password) ? 'var(--green2)' : 'var(--text3)' }}>
                        <Check size={10} style={{ opacity: r.test(password) ? 1 : 0.3 }} />
                        {r.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:13, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:6 }}>Confirm password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required
                style={{ borderRadius:10, borderColor: confirm && confirm !== password ? 'var(--red)' : undefined }} />
              {confirm && confirm !== password && <p style={{ fontSize:11, color:'var(--red)', marginTop:4 }}>Passwords don't match</p>}
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ width:'100%', justifyContent:'center', padding:'12px', fontSize:14, borderRadius:11, opacity: loading ? 0.7 : 1 }}>
              {loading ? <><Loader2 size={15} className="spinner" /> Creating account…</> : <>Create account <ArrowRight size={14} /></>}
            </button>
          </form>
        </div>

        <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'var(--text3)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color:'var(--accent3)', fontWeight:500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}