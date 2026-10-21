import { Link, useParams } from 'react-router-dom'

import Footer from '../components/layout/Footer.jsx'
import Navbar from '../components/layout/Navbar.jsx'
import courses from '../data/courses.js'

export default function CourseDetails() {
  const { courseId } = useParams()
  const course = courses.find((item) => item.id === courseId)

  if (!course) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Navbar />

        <main className="flex flex-1 items-center justify-center bg-slate-50 px-5 py-20">
          <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-[#19366e]">
              Courses
            </p>
            <h1 className="mt-3 text-2xl font-bold text-slate-950">
              Course not found
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This course is not available. Browse the courses offered by
              Expert Learning Center.
            </p>
            <Link
              to="/#courses"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#19366e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#122951]"
            >
              Browse courses
            </Link>
          </section>
        </main>

        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />

      <main className="flex-1">
        <section className="border-b border-slate-200 bg-[#f4f6fb] px-5 py-14 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <Link
              to="/#courses"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#19366e] hover:text-[#122951]"
            >
              <span aria-hidden="true">←</span>
              All courses
            </Link>

            <span className="mt-7 flex w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-950">
              {course.category}
            </span>

            <h1 className="mt-4 max-w-3xl font-serif text-3xl font-bold leading-tight tracking-tight text-[#102d59] sm:text-4xl lg:text-5xl">
              {course.title}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-700">
              {course.description}
            </p>
          </div>
        </section>

        <section className="px-5 py-12 sm:py-16">
          <div className="mx-auto grid max-w-6xl gap-7 lg:grid-cols-[1.6fr_1fr]">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-bold text-slate-950">
                Programme overview
              </h2>

              <p className="mt-4 leading-8 text-slate-600">
                {course.description}
              </p>

              <dl className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Category
                  </dt>
                  <dd className="mt-2 text-sm font-bold text-slate-900">
                    {course.category}
                  </dd>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Level
                  </dt>
                  <dd className="mt-2 text-sm font-bold text-slate-900">
                    {course.level}
                  </dd>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Duration
                  </dt>
                  <dd className="mt-2 text-sm font-bold text-slate-900">
                    {course.duration}
                  </dd>
                </div>
              </dl>
            </article>

            <aside className="h-fit rounded-2xl border border-blue-100 bg-blue-50 p-6 sm:p-7">
              <h2 className="text-lg font-bold text-slate-950">
                Enrolment information
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-700">
                For current batch schedules and enrolment information,
                please contact the center.
              </p>

              <Link
                to="/#courses"
                className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#19366e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#122951]"
              >
                Browse all courses
              </Link>

              <Link
                to="/login"
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#9aacc7] bg-white px-5 py-3 text-sm font-semibold text-[#19366e] transition hover:border-[#19366e]"
              >
                Student &amp; Staff Login
              </Link>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                Login is only required for the student and staff portal.
              </p>
            </aside>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
