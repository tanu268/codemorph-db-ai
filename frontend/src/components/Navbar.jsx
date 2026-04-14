// src/components/Navbar.jsx
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Upload, GitBranch, BarChart2, Zap, LogOut, User, History, Database, FileCode,  } from 'lucide-react'
import { useMigration } from '@/context/MigrationContext'
import { useAuth } from '@/context/AuthContext'

const links = [
  { to:'/dashboard',       label:'Dashboard',   Icon:LayoutDashboard },
  { to:'/upload',          label:'Upload',      Icon:Upload },
  { to:'/pipeline',        label:'Pipeline',    Icon:GitBranch },
  { to:'/metrics',         label:'Metrics',     Icon:BarChart2 },
  { to:'/history',         label:'History',     Icon:History },
  { to:'/schema-insights', label:'Schema',      Icon:Database,  oracle:true },
  { to:'/sql-preview',     label:'Oracle DDL',  Icon:FileCode,  oracle:true },
 
]

export default function Navbar() {
  const { uploadedRepo } = useMigration()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <nav style={{
      position:'sticky', top:0, zIndex:100,
      background:'rgba(8,11,18,0.85)', backdropFilter:'blur(16px)',
      borderBottom:'1px solid rgba(255,255,255,0.06)',
      padding:'0 32px',
      display:'flex', alignItems:'center', justifyContent:'space-between',
      height:60,
    }}>
      {/* Logo */}
      <NavLink to="/" style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:32, height:32, background:'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Zap size={16} color="white" fill="white" />
        </div>
        <span style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:17, letterSpacing:'-0.02em' }}>
          Code<span style={{ color:'var(--accent2)' }}>Morph</span>
        </span>
      </NavLink>

      {/* Nav links */}
      <div style={{ display:'flex', gap:2 }}>
        {links.map(({ to, label, Icon, oracle }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            display:'flex', alignItems:'center', gap:7,
            padding:'6px 14px', borderRadius:8, fontSize:13, fontWeight:500,
            color: isActive ? 'var(--text)' : 'var(--text2)',
background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
border: isActive ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',ho
          })}>
            <Icon size={14} />{label}
          </NavLink>
        ))}
      </div>

      {/* Right side */}
      <div style={{ display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ fontSize:12, color:'var(--text3)', display:'flex', alignItems:'center', gap:6 }}>
          {uploadedRepo ? (
            <>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', display:'inline-block', animation:'pulse-glow 2s infinite' }} />
              <span style={{ color:'var(--text2)', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {uploadedRepo.original_filename}
              </span>
            </>
          ) : (
            <>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--text3)', display:'inline-block' }} />
              No repo loaded
            </>
          )}
        </div>
        {user && (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 10px', borderRadius:8, background:'var(--bg2)', border:'1px solid var(--border)' }}>
              <div style={{ width:24, height:24, borderRadius:'50%', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <User size={12} color="white" />
              </div>
              <span style={{ fontSize:12, fontWeight:500, color:'var(--text2)', maxWidth:100, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {user.username || user.email}
              </span>
            </div>
            <button onClick={handleLogout} style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'5px 10px', borderRadius:8, border:'1px solid var(--border)',
              background:'transparent', color:'var(--text3)', fontSize:12, cursor:'pointer',
              transition:'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.1)'; e.currentTarget.style.color='#f87171'; e.currentTarget.style.borderColor='rgba(239,68,68,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text3)'; e.currentTarget.style.borderColor='var(--border)' }}
            >
              <LogOut size={12} /> Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}