import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { apiRequest } from '../lib/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await apiRequest('/api/v1/auth/me')
      setUser(result.user || null)
      return result.user || null
    } catch (err) {
      if (err.status === 401) {
        setUser(null)
        return null
      }

      setError(err.message || 'Unable to verify your session.')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    function handleUnauthorized() {
      setUser(null)
    }

    window.addEventListener('elc:unauthorized', handleUnauthorized)
    return () =>
      window.removeEventListener(
        'elc:unauthorized',
        handleUnauthorized,
      )
  }, [])

  const login = useCallback(async (credentials) => {
    const result = await apiRequest('/api/v1/auth/login', {
      method: 'POST',
      body: credentials,
    })

    setUser(result.user || null)
    setError('')
    return result.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiRequest('/api/v1/auth/logout', { method: 'POST' })
    } catch {
      // The local session is cleared even if the server is unreachable.
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, loading, error, refresh, login, logout }),
    [user, loading, error, refresh, login, logout],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }

  return context
}
