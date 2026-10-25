import { SITE_LAST_UPDATED } from '../config/institute.js'
import {
  LEGAL_LAST_UPDATED,
  LEGAL_PATHS,
} from '../config/legal.js'
import courses from './courses.js'

const publicPages = [
  { path: '/', lastmod: SITE_LAST_UPDATED },
  { path: '/contact', lastmod: SITE_LAST_UPDATED },
  ...courses.map((course) => ({
    path: `/courses/${course.id}`,
    lastmod: SITE_LAST_UPDATED,
  })),
  { path: LEGAL_PATHS.privacy, lastmod: LEGAL_LAST_UPDATED },
  { path: LEGAL_PATHS.terms, lastmod: LEGAL_LAST_UPDATED },
]

export default publicPages
