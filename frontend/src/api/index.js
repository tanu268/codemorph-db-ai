import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 60000,
})

api.interceptors.response.use(
  res => res,
  err => {
    const msg = err.response?.data?.errors || err.response?.data?.error || err.message
    return Promise.reject(new Error(typeof msg === 'string' ? msg : JSON.stringify(msg)))
  }
)

// ─── Uploader ─────────────────────────────────────────────
// POST /api/v1/uploader/upload/
// Body: FormData { zip_file: File }
// Returns: { success, message, data: { id, original_filename, status, created_at, ... } }
export const uploadRepository = (file) => {
  const form = new FormData()
  form.append('zip_file', file)
  return api.post('/uploader/upload/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

// POST /api/v1/uploader/parse/<repo_id>/
// Returns: { success, data: { pipeline results } }
export const parseRepository = (repoId) =>
  api.post(`/uploader/parse/${repoId}/`)

// ─── Converter ────────────────────────────────────────────
// POST /api/v1/converter/convert/
// Body: { source_code, source_lang, target_lang }
// Returns: { converted_code, model }
export const convertCode = (sourceCode, sourceLang, targetLang) =>
  api.post('/converter/convert/', { source_code: sourceCode, source_lang: sourceLang, target_lang: targetLang })

// ─── Validator / Metrics ──────────────────────────────────
// POST /api/v1/validator/metrics/<repo_id>/
// Body: { total_routes_found, routes_converted, validation_passed, total_execution_ms, experiment_name, parser_version, ... }
// Returns: { success, data: MigrationExperiment }
export const saveMetrics = (repoId, payload) =>
  api.post(`/validator/metrics/${repoId}/`, payload)

export default api

export const downloadOutput = (repoId) =>
  api.get(`/uploader/download/${repoId}/`, { responseType: 'blob' })

// ─── Migration History ─────────────────────────────────────────────────────
// GET /api/v1/uploader/history/
// Returns: [{ id, original_filename, status, created_at, experiments: [...] }]
export const getMigrationHistory = () => api.get('/uploader/history/')

// DELETE /api/v1/uploader/history/<repo_id>/
export const deleteMigration = (repoId) => api.delete(`/uploader/history/${repoId}/`)