import SectionHeading from '../common/SectionHeading.jsx'
import TopperCard from '../toppers/TopperCard.jsx'

const sampleToppers = [
  {
    id: 'sample-1',
    name: 'Aarav Kumar',
    className: '10',
    board: 'CBSE',
    percentage: 95.4,
    session: '2025–26',
    photo: '/toppers/aaaa.jpeg',
    published: true,
  },
  {
    id: 'sample-2',
    name: 'Ananya Singh',
    className: '12',
    board: 'CBSE',
    percentage: 93.8,
    session: '2025–26',
    photo: '/toppers/bbbb.jpeg',
    published: true,
  },
  {
    id: 'sample-3',
    name: 'Aditya Kumar',
    className: '10',
    board: 'BSEB',
    percentage: 92.6,
    session: '2025–26',
    photo: 'toppers/aaaa,jpeg',
    published: true,
  },
]

export default function TopStudents() {
  const publishedToppers = sampleToppers.filter(
    (topper) => topper.published,
  )

  return (
    <section id="toppers" className="scroll-mt-28 bg-slate-50 px-5 py-20">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Celebrating achievement"
          title="Our Star Performers"
          description="Recognising the dedication and hard work of our students."
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {publishedToppers.map((topper) => (
            <TopperCard key={topper.id} topper={topper} />
          ))}
        </div>

        {publishedToppers.length === 0 && (
          <p className="text-center text-slate-500">
            Student achievements will appear here soon.
          </p>
        )}
      </div>
    </section>
  )
}