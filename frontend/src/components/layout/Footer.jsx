import { Link } from 'react-router-dom'

const quickLinks = [
  { label: 'Home', href: '/#home' },
  { label: 'Courses', href: '/#courses' },
  { label: 'About Us', href: '/#about' },
  { label: 'Announcements', href: '/#announcements' },
  { label: 'Our Toppers', href: '/#toppers' },
]

export default function Footer() {
  return (
    <footer className="bg-[#0d1c36] text-slate-300">
      <div className="mx-auto grid w-full max-w-[1600px] gap-10 px-5 py-10 sm:grid-cols-2 sm:px-8 sm:py-12 lg:grid-cols-3 lg:gap-12 lg:px-10 xl:px-14">
        {/* Institute information */}
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-3 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white font-serif text-xl font-bold text-[#19366e]">
              E
            </span>

            <span>
              <span className="block text-lg font-bold text-white">
                Expert Learning Center
              </span>
              <span className="mt-1 block text-xs tracking-wide text-slate-400">
                Learn Today. Lead Tomorrow.
              </span>
            </span>
          </Link>

          <p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">
            Building strong foundations through quality education, consistent
            practice, and personal academic guidance.
          </p>
        </div>

        {/* Quick links */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white">
            Quick Links
          </h2>

          <nav aria-label="Footer navigation" className="mt-4">
            <ul className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-1">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="inline-flex min-h-7 items-center text-slate-400 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Contact and portal */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white">
            Student &amp; Staff Portal
          </h2>

          <p className="mt-4 text-sm leading-7 text-slate-400">
            Access institute services, academic updates, and student resources
            through the ELC portal.
          </p>

          <Link
            to="/login"
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#19366e] transition-colors hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1c36]"
          >
            Open Login Portal
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {/* Copyright bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center justify-between gap-2 px-5 py-5 text-center sm:flex-row sm:px-8 sm:text-left lg:px-10 xl:px-14">
          <p className="text-xs leading-5 text-slate-400">
            © {new Date().getFullYear()} Expert Learning Center. All rights reserved.
          </p>

          <p className="text-xs text-slate-500">
            Learn with purpose. Progress with confidence.
          </p>
        </div>
      </div>
    </footer>
  )
}