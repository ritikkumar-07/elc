import { lazy, Suspense, useEffect } from 'react'
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'

import ProtectedRoute from './components/common/ProtectedRoute.jsx'
import SeoManager from './components/seo/SeoManager.jsx'
import { LoadingState } from './components/common/DashboardUI.jsx'
import CookieConsent from './components/privacy/CookieConsent.jsx'
import Analytics from './components/privacy/Analytics.jsx'
import Footer from './components/layout/Footer.jsx'
import Navbar from './components/layout/Navbar.jsx'
import Home from './pages/Home.jsx'

const Contact = lazy(() => import('./pages/Contact.jsx'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.jsx'))
const TermsAndConditions = lazy(() =>
  import('./pages/TermsAndConditions.jsx'),
)
const CourseDetails = lazy(() =>
  import('./pages/CourseDetails.jsx'),
)
const DashboardHome = lazy(() =>
  import('./pages/DashboardHome.jsx'),
)
const Login = lazy(() => import('./pages/Login.jsx'))
const Register = lazy(() => import('./pages/Register.jsx'))
const RegistrationApprovals = lazy(() =>
  import('./pages/RegistrationApprovals.jsx'),
)
const StudentManagement = lazy(() =>
  import('./pages/StudentManagement.jsx'),
)
const TeacherManagement = lazy(() =>
  import('./pages/TeacherManagement.jsx'),
)
const AcademicManagement = lazy(() =>
  import('./pages/AcademicManagement.jsx'),
)
const MaterialManagement = lazy(() =>
  import('./pages/MaterialManagement.jsx'),
)
const TestManagement = lazy(() =>
  import('./pages/TestManagement.jsx'),
)
const TeacherResults = lazy(() =>
  import('./pages/TeacherResults.jsx'),
)
const AdminResults = lazy(() =>
  import('./pages/AdminResults.jsx'),
)
const StudentResults = lazy(() =>
  import('./pages/StudentResults.jsx'),
)
const AttendancePage = lazy(() =>
  import('./pages/AttendancePage.jsx'),
)
const AnnouncementManagement = lazy(() =>
  import('./pages/AnnouncementManagement.jsx'),
)
const TopperManagement = lazy(() =>
  import('./pages/TopperManagement.jsx'),
)
const HeroBannerManagement = lazy(() =>
  import('./pages/HeroBannerManagement.jsx'),
)
const TeacherStudents = lazy(() =>
  import('./pages/TeacherStudents.jsx'),
)
const StudentMaterials = lazy(() =>
  import('./pages/StudentMaterials.jsx'),
)
const StudentTests = lazy(() =>
  import('./pages/StudentTests.jsx'),
)

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />

      <main
        id="main-content"
        tabIndex={-1}
        aria-labelledby="not-found-title"
        className="flex flex-1 items-center justify-center bg-[#f6f8fc] px-5 py-16 sm:py-24"
      >
        <section className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-800">
            Error 404
          </p>

          <h1
            id="not-found-title"
            className="mt-4 font-serif text-3xl font-bold tracking-tight text-[#102d59] sm:text-5xl"
          >
            Page not found
          </h1>

          <p className="mx-auto mt-5 max-w-lg text-base leading-8 text-slate-600">
            The page you are looking for may have moved, or the address may be
            incorrect. You can return to the homepage or continue to one of the
            links below.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 min-[420px]:flex-row min-[420px]:flex-wrap">
            <Link
              to="/"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#19366e] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#122951] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#19366e] focus-visible:ring-offset-2"
            >
              Return home
            </Link>
            <Link
              to="/#courses"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#19366e] focus-visible:ring-offset-2"
            >
              Browse courses
            </Link>
            <Link
              to="/contact"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#19366e] focus-visible:ring-offset-2"
            >
              Contact us
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

function ScrollManager() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.slice(1))
      const target = document.getElementById(id)

      if (target) {
        const frame = window.requestAnimationFrame(() => {
          const reduceMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
          ).matches

          target.scrollIntoView({
            behavior: reduceMotion ? 'auto' : 'smooth',
            block: 'start',
          })
        })

        return () => window.cancelAnimationFrame(frame)
      }
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    return undefined
  }, [pathname, hash])

  return null
}

function Protected({ roles, children }) {
  return <ProtectedRoute roles={roles}>{children}</ProtectedRoute>
}

export default function App() {
  return (
    <BrowserRouter>
      <SeoManager />
      <ScrollManager />
      <Analytics />
      <CookieConsent />
      <Suspense
        fallback={<LoadingState label="Loading..." fullPage />}
      >
        <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/courses"
          element={<Navigate to="/#courses" replace />}
        />
        <Route
          path="/courses/:courseId"
          element={<CourseDetails />}
        />
        <Route path="/contact" element={<Contact />} />
        <Route
          path="/privacy-policy"
          element={<PrivacyPolicy />}
        />
        <Route
          path="/terms-and-conditions"
          element={<TermsAndConditions />}
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/admin"
          element={
            <Protected roles={['admin']}>
              <DashboardHome />
            </Protected>
          }
        />
        <Route
          path="/admin/registrations"
          element={
            <Protected roles={['admin']}>
              <RegistrationApprovals />
            </Protected>
          }
        />
        <Route
          path="/admin/students"
          element={
            <Protected roles={['admin']}>
              <StudentManagement />
            </Protected>
          }
        />
        <Route
          path="/admin/teachers"
          element={
            <Protected roles={['admin']}>
              <TeacherManagement />
            </Protected>
          }
        />
        <Route
          path="/admin/classes"
          element={
            <Protected roles={['admin']}>
              <AcademicManagement />
            </Protected>
          }
        />
        <Route
          path="/admin/notes"
          element={
            <Protected roles={['admin']}>
              <MaterialManagement />
            </Protected>
          }
        />
        <Route
          path="/admin/tests"
          element={
            <Protected roles={['admin']}>
              <TestManagement />
            </Protected>
          }
        />
        <Route
          path="/admin/results"
          element={
            <Protected roles={['admin']}>
              <AdminResults />
            </Protected>
          }
        />
        <Route
          path="/admin/attendance"
          element={
            <Protected roles={['admin']}>
              <AttendancePage />
            </Protected>
          }
        />
        <Route
          path="/admin/announcements"
          element={
            <Protected roles={['admin']}>
              <AnnouncementManagement />
            </Protected>
          }
        />
        <Route
          path="/admin/toppers"
          element={
            <Protected roles={['admin']}>
              <TopperManagement />
            </Protected>
          }
        />
        <Route
          path="/admin/hero-banners"
          element={
            <Protected roles={['admin']}>
              <HeroBannerManagement />
            </Protected>
          }
        />

        <Route
          path="/teacher"
          element={
            <Protected roles={['teacher']}>
              <DashboardHome />
            </Protected>
          }
        />
        <Route
          path="/teacher/students"
          element={
            <Protected roles={['teacher']}>
              <TeacherStudents />
            </Protected>
          }
        />
        <Route
          path="/teacher/notes"
          element={
            <Protected roles={['teacher']}>
              <MaterialManagement />
            </Protected>
          }
        />
        <Route
          path="/teacher/tests"
          element={
            <Protected roles={['teacher']}>
              <TestManagement />
            </Protected>
          }
        />
        <Route
          path="/teacher/results"
          element={
            <Protected roles={['teacher']}>
              <TeacherResults />
            </Protected>
          }
        />
        <Route
          path="/teacher/attendance"
          element={
            <Protected roles={['teacher']}>
              <AttendancePage />
            </Protected>
          }
        />
        <Route
          path="/teacher/announcements"
          element={
            <Protected roles={['teacher']}>
              <AnnouncementManagement />
            </Protected>
          }
        />

        <Route
          path="/student"
          element={
            <Protected roles={['student']}>
              <DashboardHome />
            </Protected>
          }
        />
        <Route
          path="/student/notes"
          element={
            <Protected roles={['student']}>
              <StudentMaterials />
            </Protected>
          }
        />
        <Route
          path="/student/tests"
          element={
            <Protected roles={['student']}>
              <StudentTests />
            </Protected>
          }
        />
        <Route
          path="/student/results"
          element={
            <Protected roles={['student']}>
              <StudentResults />
            </Protected>
          }
        />
        <Route
          path="/student/attendance"
          element={
            <Protected roles={['student']}>
              <AttendancePage />
            </Protected>
          }
        />

        <Route
          path="/demo/toppers"
          element={<Navigate to="/admin/toppers" replace />}
        />

        <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
