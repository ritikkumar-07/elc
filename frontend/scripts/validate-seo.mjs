import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadEnv } from 'vite'

import publicPages from '../src/data/publicPages.js'
import { resolveSiteUrl } from '../src/config/siteUrl.js'

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const outDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(projectRoot, 'dist')
const fileEnv = loadEnv('production', projectRoot, 'VITE_')
const siteUrl = resolveSiteUrl(
  {
    VITE_SITE_URL: process.env.VITE_SITE_URL || fileEnv.VITE_SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL:
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
  },
  { allowVercelFallback: true },
)

const problems = []

async function readOutput(name) {
  try {
    return await readFile(path.join(outDir, name), 'utf8')
  } catch {
    problems.push(`Missing build output: ${name}`)
    return ''
  }
}

const sitemap = await readOutput('sitemap.xml')
const robots = await readOutput('robots.txt')
const indexHtml = await readOutput('index.html')

if (sitemap) {
  if (!sitemap.startsWith('<?xml')) {
    problems.push('sitemap.xml does not start with an XML declaration.')
  }

  if (!sitemap.includes('<urlset')) {
    problems.push('sitemap.xml has no urlset element.')
  }

  const locations = Array.from(
    sitemap.matchAll(/<loc>([^<]+)<\/loc>/g),
    (match) => match[1],
  )

  if (siteUrl) {
    if (locations.length !== publicPages.length) {
      problems.push(
        `sitemap.xml has ${locations.length} URLs; expected ${publicPages.length}.`,
      )
    }

    for (const page of publicPages) {
      const expected = new URL(page.path, `${siteUrl}/`).toString()

      if (!locations.includes(expected)) {
        problems.push(`sitemap.xml is missing ${expected}`)
      }
    }

    if (!robots.includes(`Sitemap: ${siteUrl}/sitemap.xml`)) {
      problems.push('robots.txt does not reference the generated sitemap.')
    }

    if (!indexHtml.includes(`content="${siteUrl}/og-image.png"`)) {
      problems.push('index.html does not contain the absolute social image URL.')
    }
  } else {
    if (locations.length > 0) {
      problems.push(
        'sitemap.xml contains URLs even though VITE_SITE_URL is not configured.',
      )
    }

    console.warn(
      'SEO warning: no public site URL is configured. Set VITE_SITE_URL or deploy with VERCEL_PROJECT_PRODUCTION_URL. Sitemap URLs, robots.txt Sitemap line, and absolute social images cannot be validated.',
    )
  }

  for (const location of locations) {
    if (!/^https:\/\//i.test(location)) {
      problems.push(`sitemap.xml contains a non-HTTPS URL: ${location}`)
    }

    if (/localhost|127\.0\.0\.1/i.test(location)) {
      problems.push(`sitemap.xml contains a local URL: ${location}`)
    }
  }
}

if (robots && !robots.includes('User-agent:')) {
  problems.push('robots.txt has no User-agent directive.')
}

if (problems.length > 0) {
  console.error('SEO validation failed:')
  for (const problem of problems) {
    console.error(`- ${problem}`)
  }
  process.exitCode = 1
} else {
  console.log('SEO validation passed.')
}
