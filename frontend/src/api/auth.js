
import axios from 'axios'

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/api/v1/auth`,
  timeout: 15000,
})

// Attach token automatically
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
          const res = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL}/api/v1/auth/token/refresh/`,
            { refresh }
          )

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

    const msg =
      err.response?.data?.detail ||
      err.response?.data?.error ||
      err.message

    return Promise.reject(
      new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
    )
  }
)

export const authApi = {
  register: (username, email, password) =>
    api.post('/register/', { username, email, password }),

  login: (email, password) =>
    api.post('/login/', { email, password }),

  googleLogin: (credential) =>
    api.post('/google/', { credential }),

  me: () => api.get('/me/'),

  refresh: (refresh) =>
    api.post('/token/refresh/', { refresh }),

  logout: (refresh) =>
    api.post('/logout/', { refresh }),
}

export default api
