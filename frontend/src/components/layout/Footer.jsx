import { ArrowRight, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'

import { institute } from '../../config/institute.js'
import courses from '../../data/courses.js'
import SocialLinks from '../common/SocialLinks.jsx'

const quickLinks = [
  { label: 'Home', href: '/' },
  { label: 'Courses', href: '/#courses' },
  { label: 'About Us', href: '/#about' },
  { label: 'Announcements', href: '/#announcements' },
  { label: 'Toppers', href: '/#toppers' },
  { label: 'Contact Us', href: '/contact' },
]

const linkClass =
  'inline-flex min-h-7 items-center rounded text-slate-400 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300'

export default function Footer() {
  return (
    <footer className="bg-[#0d1c36] text-slate-300">
      <div className="mx-auto grid w-full max-w-[1600px] gap-10 px-5 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-2 lg:gap-12 lg:px-10 xl:grid-cols-[1.35fr_0.8fr_0.9fr_1.2fr] xl:px-14">
        <div>
          <Link
            to="/"
            aria-label={`${institute.name} home`}
            className="inline-flex items-center gap-3 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1c36]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white font-serif text-xl font-bold text-[#19366e]">
              E
            </span>

            <span>
              <span className="block text-lg font-bold text-white">
                {institute.name}
              </span>
              <span className="mt-1 block text-xs tracking-wide text-slate-400">
                {institute.tagline}
              </span>
            </span>
          </Link>

          <p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">
            Expert Learning Center supports students through structured
            learning, regular practice, and academic guidance in Mirganj,
            Gopalganj.
          </p>

          <SocialLinks className="mt-6" />
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white">
            Quick Links
          </h2>

          <nav aria-label="Footer navigation" className="mt-4">
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-1">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white">
            Contact
          </h2>

          <address className="mt-4 space-y-3 not-italic">
            <p className="text-sm leading-6 text-slate-400">
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Director
              </span>
              {institute.director.name}
            </p>

            <p className="flex items-start gap-2 text-sm leading-6 text-slate-400">
              <MapPin
                size={16}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-[#e6b34a]"
              />
              {institute.address.display}
            </p>

            <p>
              <a
                href={institute.phone.href}
                className="flex min-h-9 items-center gap-2 rounded text-sm text-slate-300 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <Phone
                  size={16}
                  aria-hidden="true"
                  className="shrink-0 text-[#e6b34a]"
                />
                {institute.phone.display}
              </a>
            </p>

            <p>
              <a
                href={institute.email.href}
                className="flex min-h-9 items-center gap-2 break-all rounded text-sm text-slate-300 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <Mail
                  size={16}
                  aria-hidden="true"
                  className="shrink-0 text-[#e6b34a]"
                />
                {institute.email.display}
              </a>
            </p>
          </address>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white">
            Courses &amp; Portal
          </h2>

          <ul className="mt-4 space-y-2 text-sm">
            {courses.map((course) => (
              <li key={course.id}>
                <Link
                  to={`/courses/${course.id}`}
                  className={linkClass}
                >
                  {course.title}
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-sm leading-7 text-slate-400">
            Access academic updates, learning resources, and student services
            through the ELC portal.
          </p>

          <Link
            to="/login"
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#19366e] transition-colors hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1c36]"
          >
            Student &amp; Staff Portal
            <ArrowRight size={16} aria-hidden="true" />
          </Link>

          <a
            href={institute.whatsapp.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${institute.whatsapp.label} (opens WhatsApp in a new tab)`}
            className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#e6b34a] px-5 py-3 text-center text-sm font-bold text-[#102d59] transition-colors hover:bg-[#f0c466] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1c36]"
          >
            <MessageCircle size={16} aria-hidden="true" />
            {institute.whatsapp.label}
          </a>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center justify-between gap-2 px-5 py-5 text-center sm:flex-row sm:px-8 sm:text-left lg:px-10 xl:px-14">
          <p className="text-xs leading-5 text-slate-400">
            © {new Date().getFullYear()} {institute.name}. All rights
            reserved.
          </p>

          <p className="text-xs text-slate-500">
            {institute.tagline}
          </p>
        </div>
      </div>
    </footer>
  )
}
