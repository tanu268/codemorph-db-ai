export default function StatCard({ label, value, sub, icon: Icon, color = 'var(--accent)' }) {
  return (
    <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          {label}
        </p>
        <p style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-head)', color: 'var(--text)', lineHeight: 1 }}>
          {value ?? '—'}
          {sub && <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text2)', marginLeft: 4 }}>{sub}</span>}
        </p>
      </div>
      {Icon && (
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={16} color={color} />
        </div>
      )}
    </div>
  )
}
