import SectionHeading from '../common/SectionHeading.jsx'

const features = [
  {
    icon: '01',
    title: 'Structured Learning',
    description:
      'Follow a clear learning path designed to help students strengthen concepts step by step.',
  },
  {
    icon: '02',
    title: 'Regular Practice',
    description:
      'Build confidence through practice, revision, and consistent academic effort.',
  },
  {
    icon: '03',
    title: 'Academic Guidance',
    description:
      'Get guidance to identify learning gaps and work towards meaningful improvement.',
  },
]

export default function Features() {
  return (
    <section className="bg-white px-5 py-20">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Why choose us"
          title="A Better Way to Learn"
          description="The right learning environment can make a meaningful difference in a student's journey."
        />

        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-slate-200 bg-white p-7 transition hover:-translate-y-1 hover:shadow-xl"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 font-extrabold text-blue-900">
                {feature.icon}
              </span>
              <h3 className="mt-5 text-xl font-bold text-slate-900">
                {feature.title}
              </h3>
              <p className="mt-3 leading-7 text-slate-600">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}