import { Loader2 } from 'lucide-react'

export default function Loader({ text = 'Loading...' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 12, padding: '80px 32px',
      color: 'var(--text2)', fontSize: 14,
    }}>
      <Loader2 size={28} className="spinner" color="var(--accent)" />
      {text}
    </div>
  )
}
