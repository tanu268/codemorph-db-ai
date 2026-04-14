import { createContext, useContext, useState } from 'react'

const MigrationContext = createContext(null)

export function MigrationProvider({ children }) {
  const [uploadedRepo, setUploadedRepo]   = useState(null)  // { id, original_filename, ... }
  const [pipelineResult, setPipelineResult] = useState(null) // full pipeline data
  const [metrics, setMetrics]             = useState(null)   // experiment metrics
  const [isProcessing, setIsProcessing]   = useState(false)

  return (
    <MigrationContext.Provider value={{
      uploadedRepo,   setUploadedRepo,
      pipelineResult, setPipelineResult,
      metrics,        setMetrics,
      isProcessing,   setIsProcessing,
    }}>
      {children}
    </MigrationContext.Provider>
  )
}

export const useMigration = () => {
  const ctx = useContext(MigrationContext)
  if (!ctx) throw new Error('useMigration must be used inside MigrationProvider')
  return ctx
}
