import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1/auth',
  timeout: 15000,
})

// Attach token to every request automatically
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const res = await axios.post('/api/v1/auth/token/refresh/', { refresh })
          localStorage.setItem('access_token', res.data.access)
          original.headers.Authorization = `Bearer ${res.data.access}`
          return api(original)
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      }
    }
    const msg = err.response?.data?.detail || err.response?.data?.error || err.message
    return Promise.reject(new Error(typeof msg === 'string' ? msg : JSON.stringify(msg)))
  }
)

export const authApi = {
  // POST /api/v1/auth/register/
  // { username, email, password } → { access, refresh, user }
  register: (username, email, password) =>
    api.post('/register/', { username, email, password }),

  // POST /api/v1/auth/login/
  // { email, password } → { access, refresh }
  login: (email, password) =>
    api.post('/login/', { email, password }),

  // POST /api/v1/auth/google/
  // { credential } → { access, refresh }
  googleLogin: (credential) =>
    api.post('/google/', { credential }),

  // GET /api/v1/auth/me/
  // → { id, username, email, date_joined }
  me: () => api.get('/me/'),

  // POST /api/v1/auth/token/refresh/
  refresh: (refresh) =>
    api.post('/token/refresh/', { refresh }),

  // POST /api/v1/auth/logout/
  logout: (refresh) =>
    api.post('/logout/', { refresh }),
}

export default api