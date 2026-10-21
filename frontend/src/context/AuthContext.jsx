import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  apiRequest,
  UNAUTHORIZED_EVENT,
} from '../lib/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const mountedRef = useRef(false)
  const userRef = useRef(null)
  const sessionVersionRef = useRef(0)
  const inFlightRefreshRef = useRef(null)

  const applyUser = useCallback((nextUser) => {
    userRef.current = nextUser
    setUser(nextUser)
  }, [])

  const refresh = useCallback(
    (options = {}) => {
      const { silent = false } = options

      if (inFlightRefreshRef.current) {
        return inFlightRefreshRef.current
      }

      const sessionVersion = sessionVersionRef.current

      if (!silent) {
        setLoading(true)
        setError('')
      }

      const request = (async () => {
        try {
          const result = await apiRequest('/api/v1/auth/me', {
            skipAuthEvent: true,
          })

          if (
            !mountedRef.current ||
            sessionVersion !== sessionVersionRef.current
          ) {
            return result.user || null
          }

          applyUser(result.user || null)
          setError('')
          return result.user || null
        } catch (err) {
          if (err.name === 'AbortError') return null

          if (
            !mountedRef.current ||
            sessionVersion !== sessionVersionRef.current
          ) {
            return null
          }

          if (err.status === 401) {
            applyUser(null)
            setError('')
            return null
          }

          setError(
            err.message || 'Unable to verify your session.',
          )

          // A network or server outage must not be treated as a logout.
          return userRef.current
        } finally {
          if (inFlightRefreshRef.current === request) {
            inFlightRefreshRef.current = null
          }

          if (mountedRef.current && !silent) {
            setLoading(false)
          }
        }
      })()

      inFlightRefreshRef.current = request
      return request
    },
    [applyUser],
  )

  useEffect(() => {
    mountedRef.current = true
    refresh()

    return () => {
      mountedRef.current = false
    }
  }, [refresh])

  useEffect(() => {
    function handleUnauthorized() {
      // Revalidate first. Only a confirmed 401 from /me clears the session.
      if (userRef.current) {
        refresh({ silent: true })
      }
    }

    window.addEventListener(
      UNAUTHORIZED_EVENT,
      handleUnauthorized,
    )

    return () =>
      window.removeEventListener(
        UNAUTHORIZED_EVENT,
        handleUnauthorized,
      )
  }, [refresh])

  const login = useCallback(
    async (credentials) => {
      const result = await apiRequest('/api/v1/auth/login', {
        method: 'POST',
        body: credentials,
        skipAuthEvent: true,
      })

      if (!result.user) {
        throw new Error(
          'The server returned an invalid login response.',
        )
      }

      sessionVersionRef.current += 1
      applyUser(result.user)
      setError('')
      setLoading(false)
      return result.user
    },
    [applyUser],
  )

  const logout = useCallback(async () => {
    sessionVersionRef.current += 1

    try {
      await apiRequest('/api/v1/auth/logout', {
        method: 'POST',
        skipAuthEvent: true,
      })
    } catch {
      // Clear local state even if the server is temporarily unreachable.
    } finally {
      if (mountedRef.current) {
        applyUser(null)
        setError('')
        setLoading(false)
      }
    }
  }, [applyUser])

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
