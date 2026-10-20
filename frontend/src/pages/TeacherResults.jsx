import DashboardLayout from '../components/dashboard/DashboardLayout.jsx'
import StaffAnalyticsView from '../components/analytics/StaffAnalyticsView.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function TeacherResults() {
  const { user, logout } = useAuth()

  return (
    <DashboardLayout
      title="Results & Analytics"
      description="Class assessment performance and student support insights."
      user={user}
      onLogout={logout}
    >
      <StaffAnalyticsView role="teacher" />
    </DashboardLayout>
  )
}
