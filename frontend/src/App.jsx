import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import TopperManagement from './pages/TopperManagement.jsx'

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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/demo/toppers" element={<TopperManagement />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}