import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

const items = [
  { section: 'MAIN', links: [ ['Overview','/admin','▦'], ['Students','/admin/students','♙'], ['Teachers','/admin/teachers','♧'] ] },
  { section: 'ACADEMICS', links: [ ['Classes & Subjects','/admin/classes','▤'], ['Study Materials','/admin/notes','▧'], ['Tests & Papers','/admin/tests','✓'], ['Results','/admin/results','↗'], ['Attendance','/admin/attendance','◷'] ] },
  { section: 'INSTITUTE', links: [ ['Topper Management','/demo/toppers','☆'], ['Announcements','/admin/announcements','♧'] ] },
]

const API_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '')

function Initials({ name }) {
  return (name || 'ELC').trim().split(/\s+/).slice(0,2).map(x => x[0]).join('').toUpperCase()
}

export default function DashboardLayout({ title = 'Dashboard', description, user, onLogout, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileMenu, setProfileMenu] = useState(false)
  const [modal, setModal] = useState(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const outside = (event) => { if (menuRef.current && !menuRef.current.contains(event.target)) setProfileMenu(false) }
    const escape = (event) => { if (event.key === 'Escape') { setSidebarOpen(false); setProfileMenu(false); setModal(null) } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [])

  async function changePassword(event) {
    event.preventDefault()
    setPasswordMessage('')
    if (newPassword.length < 8 || newPassword.length > 72) return setPasswordMessage('New password must be 8–72 characters.')
    if (newPassword !== confirmPassword) return setPasswordMessage('New passwords do not match.')
    setSaving(true)
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/change-password`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) throw new Error(data.message || 'Unable to change password.')
      setPasswordMessage('Password changed successfully.')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch (error) { setPasswordMessage(error.message || 'Request failed.') }
    finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <header className="sticky top-0 z-40 flex h-[62px] items-center justify-between gap-3 bg-[#1c2226] px-4 text-white shadow-sm sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg text-xl hover:bg-white/10 lg:hidden">☰</button>
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/60 bg-white text-lg font-black text-[#202a45]">E</span>
            <span className="truncate text-sm font-bold tracking-tight sm:text-base">Expert Learning Center</span>
          </Link>
          <span className="ml-3 hidden rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-slate-200 md:inline-flex">ELC Portal</span>
        </div>
        <div ref={menuRef} className="relative shrink-0">
          <button type="button" aria-expanded={profileMenu} aria-haspopup="menu" onClick={() => setProfileMenu(v => !v)} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/10">
            <span className="hidden text-sm font-medium sm:block">Hi, {user?.name?.trim().split(/\s+/)[0] || 'Member'}</span>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e9e5ff] text-xs font-bold text-[#473caa] ring-2 ring-white/20"><Initials name={user?.name} /></span>
            <span className="text-xs text-slate-300">⌄</span>
          </button>
          {profileMenu && <div role="menu" className="absolute right-0 top-full mt-3 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 text-slate-900 shadow-xl">
            <div className="border-b border-slate-100 px-3 py-3"><p className="truncate text-sm font-bold">{user?.name}</p><p className="truncate text-xs text-slate-500">{user?.email}</p></div>
            <button role="menuitem" onClick={() => { setProfileMenu(false); setModal('profile') }} className="w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-slate-100">My profile</button>
            <button role="menuitem" onClick={() => { setProfileMenu(false); setPasswordMessage(''); setModal('password') }} className="w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-slate-100">Change password</button>
            <Link role="menuitem" to="/" onClick={() => setProfileMenu(false)} className="block rounded-lg px-3 py-2.5 text-sm hover:bg-slate-100">Public website</Link>
            <div className="my-1 border-t border-slate-100" />
            <button role="menuitem" onClick={() => { setProfileMenu(false); onLogout?.() }} className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-50">Log out</button>
          </div>}
        </div>
      </header>

      {sidebarOpen && <button type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden" />}
      <aside className={`fixed bottom-0 left-0 top-[62px] z-50 w-[240px] overflow-y-auto border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 lg:hidden"><span className="text-sm font-bold">Navigation</span><button onClick={() => setSidebarOpen(false)} aria-label="Close navigation" className="text-xl">×</button></div>
        <nav className="py-5">
          {items.map(group => <div key={group.section} className="mb-5">
            <p className="mb-2 px-7 text-[10px] font-semibold tracking-[0.08em] text-slate-400">{group.section}</p>
            {group.links.map(([label, path, icon]) => <NavLink key={path} to={path} onClick={() => setSidebarOpen(false)} className={({ isActive }) => `flex min-h-[48px] items-center gap-4 border-l-[3px] px-6 text-[13px] transition ${isActive ? 'border-[#6657d9] bg-[#e7e2ff] font-semibold text-[#5744c8]' : 'border-transparent text-slate-700 hover:bg-slate-100'}`}>
              <span aria-hidden="true" className="grid w-5 place-items-center text-lg">{icon}</span><span>{label}</span>
            </NavLink>)}
          </div>)}
        </nav>
        <div className="mx-5 mb-5 rounded-xl bg-[#f5f3ff] p-4 text-xs text-slate-600"><p className="font-bold text-[#5744c8]">Learn Today. Lead Tomorrow.</p><p className="mt-1">Expert Learning Center</p></div>
      </aside>

      <div className="flex min-h-[calc(100vh-62px)] flex-col lg:pl-[240px]">
        <main className="mx-auto w-full max-w-[1700px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5">
            <div><p className="text-[11px] font-medium text-[#6657d9]">ELC / Dashboard</p><h1 className="mt-1 text-xl font-bold">{title}</h1>{description && <p className="mt-1 text-xs text-slate-500">{description}</p>}</div>
            <Link to="/" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Visit website ↗</Link>
          </div>
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white px-5 py-5 text-xs text-slate-500 sm:px-8"><div className="mx-auto flex max-w-[1700px] flex-wrap items-center justify-between gap-3"><span>© {new Date().getFullYear()} Expert Learning Center. All rights reserved.</span><span>Learn Today. Lead Tomorrow.</span></div></footer>
      </div>

      {modal && <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/50 p-4" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null) }}>
        <section role="dialog" aria-modal="true" aria-labelledby="elc-modal-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex items-center justify-between"><h2 id="elc-modal-title" className="text-xl font-bold">{modal === 'profile' ? 'My profile' : 'Change password'}</h2><button aria-label="Close dialog" onClick={() => setModal(null)} className="text-xl text-slate-500">×</button></div>
          {modal === 'profile' ? <div className="mt-5 space-y-3 text-sm"><p><span className="text-slate-500">Name:</span> <strong>{user?.name}</strong></p><p className="break-all"><span className="text-slate-500">Email:</span> {user?.email}</p><p><span className="text-slate-500">Role:</span> {user?.role}</p><button onClick={() => { setPasswordMessage(''); setModal('password') }} className="mt-3 w-full rounded-lg bg-[#5544bf] px-4 py-3 font-semibold text-white">Change password</button></div> : <form onSubmit={changePassword} className="mt-5 space-y-4">
            {[[ 'Current password', currentPassword, setCurrentPassword, 'current-password' ],[ 'New password', newPassword, setNewPassword, 'new-password' ],[ 'Confirm password', confirmPassword, setConfirmPassword, 'new-password' ]].map(([label,value,setter,auto], index) => <label key={label} className="block text-sm font-semibold text-slate-700">{label}<input type="password" required autoComplete={auto} minLength={index === 0 ? undefined : 8} maxLength={72} value={value} onChange={e => setter(e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-[#6657d9] focus:ring-2 focus:ring-violet-100" /></label>)}
            {passwordMessage && <p role="status" className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{passwordMessage}</p>}
            <button disabled={saving} type="submit" className="w-full rounded-lg bg-[#5544bf] px-4 py-3 font-semibold text-white disabled:opacity-60">{saving ? 'Updating...' : 'Update password'}</button>
          </form>}
        </section>
      </div>}
    </div>
  )
}