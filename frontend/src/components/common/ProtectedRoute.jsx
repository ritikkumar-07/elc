import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext.jsx'
import { ErrorState, LoadingState } from './DashboardUI.jsx'

const roleHome = {
  admin: '/admin',
  teacher: '/teacher',
  student: '/student',
}

export default function ProtectedRoute({ roles, children }) {
  const { user, loading, error, refresh } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingState label="Verifying your ELC session..." fullPage />
  }

  if (!user) {
    if (error) {
      return (
        <ErrorState
          message={error}
          onRetry={refresh}
          fullPage
        />
      )
    }

    return (
      <Navigate
        to="/login"
        state={{
          from: `${location.pathname}${location.search}`,
        }}
        replace
      />
    )
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={roleHome[user.role] || '/'} replace />
  }

  return children
}
