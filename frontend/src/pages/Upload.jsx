import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload as UploadIcon, FileArchive, CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react'
import { uploadRepository, parseRepository } from '@/api'
import { useMigration } from '@/context/MigrationContext'

const STEPS = [
  { id: 'upload', label: 'Upload ZIP',   desc: 'Uploading your repository…' },
  { id: 'parse',  label: 'Run Pipeline', desc: 'Parsing → IR → Generate → Validate…' },
  { id: 'done',   label: 'Complete',     desc: 'Migration finished!' },
]

export default function Upload() {
  const navigate = useNavigate()
  const { setUploadedRepo, setPipelineResult, setIsProcessing } = useMigration()

  const [file,       setFile]       = useState(null)
  const [dragOver,   setDragOver]   = useState(false)
  const [step,       setStep]       = useState(null)  // null | 'upload' | 'parse' | 'done' | 'error'
  const [error,      setError]      = useState(null)
  const [repoData,   setRepoData]   = useState(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.name.endsWith('.zip')) setFile(dropped)
    else setError('Please upload a .zip file.')
  }, [])

  const handleFileInput = (e) => {
    const selected = e.target.files[0]
    if (selected?.name.endsWith('.zip')) { setFile(selected); setError(null) }
    else setError('Please upload a .zip file.')
  }

  const handleRun = async () => {
    if (!file) return
    setError(null)
    setIsProcessing(true)

    try {
      // Step 1: Upload
      setStep('upload')
      const uploadRes = await uploadRepository(file)
      const repo = uploadRes.data.data
      setRepoData(repo)
      setUploadedRepo(repo)

      // Step 2: Parse (full pipeline)
      setStep('parse')
      const parseRes = await parseRepository(repo.id)
      setPipelineResult(parseRes.data)

      setStep('done')
    } catch (err) {
      setError(err.message)
      setStep('error')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 32px' }}>

      <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
        Upload Workspace
      </h1>
      <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 32 }}>
        Upload a Django repository ZIP to begin the migration pipeline.
      </p>

      {/* Drop zone */}
      <div
        onClick={() => document.getElementById('file-input').click()}
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        style={{
          border: `2px dashed ${dragOver ? 'var(--accent)' : file ? 'var(--green)' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 16,
          padding: '56px 32px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? 'rgba(99,102,241,0.05)' : file ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.02)',
          transition: 'all 0.2s',
          marginBottom: 24,
        }}
      >
        <input id="file-input" type="file" accept=".zip" style={{ display: 'none' }} onChange={handleFileInput} />
        <div style={{
          width: 64, height: 64, borderRadius: 14,
          background: file ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          {file
            ? <CheckCircle2 size={28} color="var(--green2)" />
            : <UploadIcon size={28} color="var(--accent3)" />}
        </div>
        {file ? (
          <>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{file.name}</p>
            <p style={{ fontSize: 13, color: 'var(--text2)' }}>{(file.size / 1024).toFixed(1)} KB — click to change</p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Drop your Django repo ZIP here</p>
            <p style={{ fontSize: 13, color: 'var(--text2)' }}>or click to browse • .zip files only</p>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderRadius: 10, marginBottom: 20,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
          color: '#f87171', fontSize: 13,
        }}>
          <XCircle size={16} />
          {error}
        </div>
      )}

      {/* Progress steps */}
      {step && step !== 'error' && (
        <div className="card" style={{ marginBottom: 20 }}>
          {STEPS.map((s, i) => {
            const done    = step === 'done' || (step === 'parse' && s.id === 'upload') || (step === 'done' && i < 3)
            const active  = step === s.id
            const pending = !done && !active
            return (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0',
                borderBottom: i < STEPS.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? 'rgba(16,185,129,0.2)' : active ? 'rgba(99,102,241,0.2)' : 'var(--bg3)',
                  border: `1px solid ${done ? 'rgba(16,185,129,0.4)' : active ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
                }}>
                  {done
                    ? <CheckCircle2 size={14} color="var(--green2)" />
                    : active
                    ? <Loader2 size={14} color="var(--accent3)" className="spinner" />
                    : <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text3)', display: 'block' }} />
                  }
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: done ? 'var(--green2)' : active ? 'var(--text)' : 'var(--text3)' }}>
                    {s.label}
                  </p>
                  {active && <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{s.desc}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Success */}
      {step === 'done' && (
        <div style={{
          padding: '16px 20px', borderRadius: 12, marginBottom: 20,
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={18} color="var(--green2)" />
            <div>
              <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--green2)' }}>Migration complete!</p>
              <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{repoData?.original_filename} processed successfully.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => navigate('/pipeline')}>
              Pipeline <ArrowRight size={12} />
            </button>
            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => navigate('/metrics')}>
              Metrics <ArrowRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Run button */}
      {step !== 'done' && (
        <button
          className="btn btn-primary"
          disabled={!file || (step && step !== 'error')}
          style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15, borderRadius: 12,
            opacity: !file || (step && step !== 'error') ? 0.5 : 1 }}
          onClick={handleRun}
        >
          {step && step !== 'error'
            ? <><Loader2 size={15} className="spinner" /> Running pipeline…</>
            : <><FileArchive size={15} /> Run Migration Pipeline <ArrowRight size={14} /></>
          }
        </button>
      )}

      {step === 'error' && (
        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
          onClick={() => { setStep(null); setError(null) }}>
          Try again
        </button>
      )}
    </div>
  )
}
