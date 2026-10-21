import {
  ArrowRight,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import SectionHeading from '../components/common/SectionHeading.jsx'
import Footer from '../components/layout/Footer.jsx'
import Navbar from '../components/layout/Navbar.jsx'
import { institute } from '../config/institute.js'

const contactCards = [
  {
    label: 'Phone',
    value: institute.phone.display,
    description: 'Call for admission, course, and academic enquiries.',
    href: institute.phone.href,
    icon: Phone,
  },
  {
    label: 'Email',
    value: institute.email.display,
    description: 'Write to the center for admission and course information.',
    href: institute.email.href,
    icon: Mail,
  },
  {
    label: 'Director',
    value: institute.director.name,
    description: `${institute.director.designation} of ${institute.name}.`,
    icon: UserRound,
  },
  {
    label: 'Address',
    value: institute.address.display,
    description: 'Institute location in Mirganj, Gopalganj, Bihar.',
    icon: MapPin,
  },
]

export default function Contact() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main>
        <section className="relative isolate overflow-hidden bg-[#f4f6fb] px-5 py-14 sm:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-32 -top-32 -z-10 h-80 w-80 rounded-full border border-[#19366e]/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-40 right-24 -z-10 h-72 w-72 rounded-full border border-[#19366e]/10"
          />

          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#19366e]">
                Contact ELC
              </p>

              <h1 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                Contact Expert Learning Center
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
                For admission, course, and academic enquiries, contact the
                center directly by phone or email.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a
                  href={institute.phone.href}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#e6b34a] px-5 py-3 text-sm font-bold text-[#102d59] transition-colors hover:bg-[#f0c466] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#19366e] focus-visible:ring-offset-2"
                >
                  <Phone size={17} aria-hidden="true" />
                  Call {institute.phone.display}
                </a>

                <a
                  href={institute.email.href}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#b5c2d8] bg-white px-5 py-3 text-sm font-semibold text-[#19366e] transition-colors hover:border-[#19366e] hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#19366e] focus-visible:ring-offset-2"
                >
                  <Mail size={17} aria-hidden="true" />
                  Email the center
                </a>
              </div>
            </div>

            <aside className="rounded-3xl bg-[#19366e] p-7 text-white shadow-[0_24px_60px_-30px_rgba(18,41,81,0.8)] sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
                Institute details
              </p>

              <h2 className="mt-3 text-2xl font-bold">
                {institute.name}
              </h2>

              <p className="mt-2 text-sm text-blue-100">
                {institute.tagline}
              </p>

              <dl className="mt-7 space-y-5 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-blue-200">
                    Director
                  </dt>
                  <dd className="mt-1 font-semibold">
                    {institute.director.name}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-blue-200">
                    Address
                  </dt>
                  <dd className="mt-1 leading-6 text-blue-50">
                    {institute.address.display}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-blue-200">
                    Contact
                  </dt>
                  <dd className="mt-2 space-y-2">
                    <a
                      href={institute.phone.href}
                      className="flex items-center gap-2 rounded text-blue-50 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                    >
                      <Phone size={15} aria-hidden="true" />
                      {institute.phone.display}
                    </a>

                    <a
                      href={institute.email.href}
                      className="flex items-center gap-2 rounded text-blue-50 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                    >
                      <Mail size={15} aria-hidden="true" />
                      {institute.email.display}
                    </a>
                  </dd>
                </div>
              </dl>

              <Link
                to="/#courses"
                className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#19366e] transition-colors hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#19366e]"
              >
                Explore courses
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </aside>
          </div>
        </section>

        <section className="px-5 py-14 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Reach us"
              title="Contact information"
              description="Use the verified contact details below for admission and academic enquiries."
            />

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {contactCards.map((card) => {
                const Icon = card.icon
                const content = (
                  <>
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#19366e]">
                      <Icon size={20} aria-hidden="true" />
                    </span>

                    <span className="mt-5 block text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      {card.label}
                    </span>

                    <span className="mt-2 block break-words text-base font-bold text-slate-950">
                      {card.value}
                    </span>

                    <span className="mt-2 block text-sm leading-6 text-slate-600">
                      {card.description}
                    </span>
                  </>
                )

                return card.href ? (
                  <a
                    key={card.label}
                    href={card.href}
                    className="flex min-h-52 flex-col rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-[#19366e]/30 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#19366e] focus-visible:ring-offset-2"
                  >
                    {content}
                  </a>
                ) : (
                  <article
                    key={card.label}
                    className="flex min-h-52 flex-col rounded-2xl border border-slate-200 bg-white p-6"
                  >
                    {content}
                  </article>
                )
              })}
            </div>

            <div className="mt-8 flex flex-col justify-between gap-5 rounded-2xl border border-blue-100 bg-blue-50 p-6 sm:flex-row sm:items-center sm:p-7">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-bold text-[#19366e]">
                  <MessageSquare size={17} aria-hidden="true" />
                  Admission enquiry
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                  This website does not currently include an online enquiry
                  form. Please call or email the center directly.
                </p>
              </div>

              <a
                href={institute.admissionEnquiry.href}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#19366e] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#122951] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#19366e] focus-visible:ring-offset-2"
              >
                <Phone size={16} aria-hidden="true" />
                {institute.admissionEnquiry.label}
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
