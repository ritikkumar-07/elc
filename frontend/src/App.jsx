import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import ProtectedRoute from './components/common/ProtectedRoute.jsx'
import DashboardHome from './pages/DashboardHome.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import RegistrationApprovals from './pages/RegistrationApprovals.jsx'
import StudentManagement from './pages/StudentManagement.jsx'
import TeacherManagement from './pages/TeacherManagement.jsx'
import AcademicManagement from './pages/AcademicManagement.jsx'
import MaterialManagement from './pages/MaterialManagement.jsx'
import TestManagement from './pages/TestManagement.jsx'
import TeacherResults from './pages/TeacherResults.jsx'
import AdminResults from './pages/AdminResults.jsx'
import StudentResults from './pages/StudentResults.jsx'
import AttendancePage from './pages/AttendancePage.jsx'
import AnnouncementManagement from './pages/AnnouncementManagement.jsx'
import TopperManagement from './pages/TopperManagement.jsx'
import HeroBannerManagement from './pages/HeroBannerManagement.jsx'
import TeacherStudents from './pages/TeacherStudents.jsx'
import StudentMaterials from './pages/StudentMaterials.jsx'
import StudentTests from './pages/StudentTests.jsx'

function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-5 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-blue-800">
        Error 404
      </p>

      <h1 className="mt-3 text-4xl font-extrabold text-slate-900">
        Page not found
      </h1>

      <p className="mt-3 text-slate-600">
        The page you are looking for does not exist.
      </p>

      <a
        href="/"
        className="mt-6 rounded-xl bg-blue-900 px-5 py-3 font-bold text-white"
      >
        Return Home
      </a>
    </main>
  )
}

function Protected({ roles, children }) {
  return <ProtectedRoute roles={roles}>{children}</ProtectedRoute>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
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
    </BrowserRouter>
  )
}
