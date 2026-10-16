import { Link } from 'react-router-dom'
import SectionHeading from '../common/SectionHeading.jsx'
import courses from '../../data/courses.js'

export default function Courses() {
  return (
    <section id="courses" className="scroll-mt-28 bg-slate-50 px-5 py-20">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Our academics"
          title="Explore Our Courses"
          description="Course details can be updated to match the programs actually offered by the center."
        />

        <div className="grid gap-6 md:grid-cols-3">
          {courses.map((course) => (
            <article
              key={course.id}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
            >
              <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-900">
                {course.category}
              </span>
              <h3 className="mt-5 text-xl font-bold text-slate-900">
                {course.title}
              </h3>
              <p className="mt-3 flex-1 leading-7 text-slate-600">
                {course.description}
              </p>
              <div className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-500">
                <p>Level: {course.level}</p>
                <p className="mt-1">Duration: {course.duration}</p>
              </div>
              <Link
                to="/login"
                className="mt-5 font-bold text-blue-900 hover:text-blue-700"
              >
                Enquire about courses →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}