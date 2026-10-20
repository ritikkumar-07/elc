import DashboardLayout from '../components/dashboard/DashboardLayout.jsx'
import StaffAnalyticsView from '../components/analytics/StaffAnalyticsView.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function AdminResults() {
  const { user, logout } = useAuth()

  return (
    <DashboardLayout
      title="Results Analytics"
      description="Institute-wide assessment performance and coverage."
      user={user}
      onLogout={logout}
    >
      <StaffAnalyticsView role="admin" />
    </DashboardLayout>
  )
}
