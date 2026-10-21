import { Link } from 'react-router-dom'

import SectionHeading from '../common/SectionHeading.jsx'

export default function About() {
  return (
    <section id="about" className="scroll-mt-28 bg-white px-5 py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">
        <div>
          <img
            src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=85"
            alt="Students studying together"
            className="h-80 w-full rounded-3xl object-cover shadow-lg sm:h-96"
            loading="lazy"
          />
        </div>

        <div>
          <SectionHeading
            eyebrow="About our center"
            title="Education With Purpose"
            description="Expert Learning Center aims to create a supportive environment where students can learn, practise, and grow."
          />

          <div className="space-y-4 text-slate-600">
            <p className="leading-7">
              We believe that consistent effort, clear concepts, and effective
              guidance are important parts of academic development.
            </p>
            <p className="leading-7">
              Our goal is to help students develop confidence, curiosity, and
              the habit of continuous learning.
            </p>
          </div>

          <Link
            to="/#courses"
            className="mt-7 inline-block rounded-xl bg-blue-900 px-6 py-3 font-bold text-white hover:bg-blue-800"
          >
            Explore Learning
          </Link>
        </div>
      </div>
    </section>
  )
}