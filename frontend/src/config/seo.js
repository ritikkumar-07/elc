import courses from '../data/courses.js'
import { institute } from './institute.js'
import { LEGAL_PATHS } from './legal.js'
import { normalizeSiteUrl, resolveSiteUrl } from './siteUrl.js'

export { normalizeSiteUrl, resolveSiteUrl }

const HOME_TITLE =
  'Expert Learning Center | Quality Coaching in Mirganj, Gopalganj'
const HOME_DESCRIPTION =
  'Expert Learning Center in Mirganj, Gopalganj, Bihar offers structured learning, regular practice, academic guidance, and focused courses for students.'

const homeSeo = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  robots: 'index, follow',
  canonicalPath: '/',
}

const sectionSeo = {
  home: homeSeo,
  courses: {
    title: 'Courses | Expert Learning Center',
    description:
      'Explore Foundation Courses, School Academic Support, and Exam Preparation at Expert Learning Center in Mirganj, Gopalganj, Bihar.',
    robots: 'index, follow',
    canonicalPath: '/',
  },
  about: {
    title: 'About Us | Expert Learning Center',
    description:
      'Learn how Expert Learning Center supports students through structured learning, regular practice, and academic guidance in Mirganj, Gopalganj, Bihar.',
    robots: 'index, follow',
    canonicalPath: '/',
  },
  announcements: {
    title: 'Announcements | Expert Learning Center',
    description:
      'Read public admissions and academic announcements from Expert Learning Center in Mirganj, Gopalganj, Bihar.',
    robots: 'index, follow',
    canonicalPath: '/',
  },
  toppers: {
    title: 'Student Achievements | Expert Learning Center',
    description:
      'View student achievements shared publicly by Expert Learning Center in Mirganj, Gopalganj, Bihar.',
    robots: 'index, follow',
    canonicalPath: '/',
  },
}

const contactSeo = {
  title: 'Contact Us | Expert Learning Center',
  description:
    'Contact Expert Learning Center in Mirganj, Gopalganj, Bihar. Call +91 6291089226 or email elcdirector@gmail.com for admission and course enquiries.',
  robots: 'index, follow',
  canonicalPath: '/contact',
}

function privateSeo(title, description) {
  return {
    title,
    description,
    robots: 'noindex, nofollow',
    canonicalPath: null,
  }
}

const privacySeo = {
  title: 'Privacy Policy | Expert Learning Center',
  description:
    'Read how Expert Learning Center handles account, student, academic, security, and optional analytics information on its website and portal.',
  robots: 'index, follow',
  canonicalPath: LEGAL_PATHS.privacy,
}

const termsSeo = {
  title: 'Terms & Conditions | Expert Learning Center',
  description:
    'Read the terms for using the Expert Learning Center website and student and staff portal, including account, content, and acceptable-use rules.',
  robots: 'index, follow',
  canonicalPath: LEGAL_PATHS.terms,
}

const notFoundSeo = privateSeo(
  'Page Not Found | Expert Learning Center',
  'The requested page could not be found on the Expert Learning Center website.',
)

export const siteUrl = resolveSiteUrl(import.meta.env, {
  allowVercelFallback: true,
})

export function absoluteUrl(pathname) {
  if (!siteUrl) return ''
  return new URL(pathname, `${siteUrl}/`).toString()
}

export function getPageSeo(pathname = '/', hash = '') {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/'

  if (normalizedPath === '/') {
    const sectionKey = hash.replace(/^#/, '').toLowerCase()
    return sectionSeo[sectionKey] || homeSeo
  }

  if (normalizedPath === '/courses') {
    return sectionSeo.courses
  }

  if (normalizedPath.startsWith('/courses/')) {
    const courseId = normalizedPath.slice('/courses/'.length)
    const course = courses.find((item) => item.id === courseId)

    if (!course) {
      return privateSeo(
        'Course Not Found | Expert Learning Center',
        'The requested course could not be found. Browse the courses available at Expert Learning Center.',
      )
    }

    return {
      title: `${course.title} | Expert Learning Center`,
      description: `${course.description} Explore ${course.title} at Expert Learning Center in Mirganj, Gopalganj, Bihar.`,
      robots: 'index, follow',
      canonicalPath: `/courses/${course.id}`,
    }
  }

  if (normalizedPath === '/contact') {
    return contactSeo
  }

  if (normalizedPath === LEGAL_PATHS.privacy) {
    return privacySeo
  }

  if (normalizedPath === LEGAL_PATHS.terms) {
    return termsSeo
  }

  if (normalizedPath === '/login') {
    return privateSeo(
      'Sign In | Expert Learning Center',
      'Sign in to the Expert Learning Center student and staff portal.',
    )
  }

  if (normalizedPath === '/register') {
    return privateSeo(
      'Student Registration | Expert Learning Center',
      'Create a student account for the Expert Learning Center portal.',
    )
  }

  if (normalizedPath.startsWith('/admin')) {
    return privateSeo(
      'Admin Portal | Expert Learning Center',
      'Private administration area for Expert Learning Center staff.',
    )
  }

  if (normalizedPath.startsWith('/teacher')) {
    return privateSeo(
      'Teacher Portal | Expert Learning Center',
      'Private teaching area for Expert Learning Center staff.',
    )
  }

  if (normalizedPath.startsWith('/student')) {
    return privateSeo(
      'Student Portal | Expert Learning Center',
      'Private student area for Expert Learning Center learners.',
    )
  }

  if (normalizedPath.startsWith('/demo')) {
    return privateSeo(
      'Redirecting | Expert Learning Center',
      'This page is not part of the public Expert Learning Center website.',
    )
  }

  return notFoundSeo
}

export const pageSeoDefaults = {
  home: homeSeo,
  contact: contactSeo,
  privacy: privacySeo,
  terms: termsSeo,
  sections: sectionSeo,
  notFound: notFoundSeo,
  siteName: institute.name,
  ogImagePath: '/og-image.png',
}
