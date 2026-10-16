import SectionHeading from '../common/SectionHeading.jsx'
import announcements from '../../data/announcements.js'

export default function Announcements() {
  return (
    <section
      id="announcements"
      className="scroll-mt-28 bg-blue-50 px-5 py-20"
    >
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Stay informed"
          title="Latest Announcements"
          description="Important information for students and parents."
        />

        <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
          {announcements.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-blue-100 bg-white p-6"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                {item.type}
              </span>
              <h3 className="mt-3 text-lg font-bold text-slate-900">
                {item.title}
              </h3>
              <p className="mt-2 leading-7 text-slate-600">
                {item.description}
              </p>
              {item.date && (
                <p className="mt-4 text-xs text-slate-500">{item.date}</p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}