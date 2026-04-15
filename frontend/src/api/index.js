import axios from 'axios'

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/api/v1`,
  timeout: 60000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    const msg =
      err.response?.data?.errors ||
      err.response?.data?.error ||
      err.message

    return Promise.reject(
      new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
    )
  }
)

// ─── Uploader ─────────────────────────────────────────────
export const uploadRepository = (file) => {
  const form = new FormData()
  form.append('zip_file', file)

  return api.post('/uploader/upload/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const parseRepository = (repoId) =>
  api.post(`/uploader/parse/${repoId}/`)

// ─── Converter ────────────────────────────────────────────
export const convertCode = (sourceCode, sourceLang, targetLang) =>
  api.post('/converter/convert/', {
    source_code: sourceCode,
    source_lang: sourceLang,
    target_lang: targetLang,
  })

// ─── Validator / Metrics ──────────────────────────────────
export const saveMetrics = (repoId, payload) =>
  api.post(`/validator/metrics/${repoId}/`, payload)

export const downloadOutput = (repoId) =>
  api.get(`/uploader/download/${repoId}/`, { responseType: 'blob' })

export const getMigrationHistory = () =>
  api.get('/uploader/history/')

export const deleteMigration = (repoId) =>
  api.delete(`/uploader/history/${repoId}/`)

export default api