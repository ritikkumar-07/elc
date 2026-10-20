import DashboardLayout from '../components/dashboard/DashboardLayout.jsx'
import HeroBannerManager from '../components/dashboard/HeroBannerManager.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function HeroBannerManagement() {
  const { user, logout } = useAuth()

  return (
    <DashboardLayout
      title="Hero Banner Management"
      description="Manage the slides displayed on the public homepage."
      user={user}
      onLogout={logout}
    >
      <HeroBannerManager />
    </DashboardLayout>
  )
}
