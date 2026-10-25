import Navbar from '../components/layout/Navbar.jsx'
import Footer from '../components/layout/Footer.jsx'
import Hero from '../components/home/Hero.jsx'
import Features from '../components/home/Features.jsx'
import Courses from '../components/home/Courses.jsx'
import About from '../components/home/About.jsx'
import Announcements from '../components/home/Announcements.jsx'
import TopStudents from '../components/home/TopStudents.jsx'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main id="main-content" tabIndex={-1}>
        <Hero />
        <Features />
        <Courses />
        <About />
        <Announcements />
        <TopStudents />
      </main>
      <Footer />
    </div>
  )
}