import { mkdir, readFile, writeFile } from 'node:fs/promises'
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

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function injectSocialImage(html, origin) {
  const imageUrl = new URL('/og-image.png', `${origin}/`).toString()
  const alt = 'Expert Learning Center brand card with location, telephone, and email.'
  const tags = [
    `<meta property="og:image" content="${imageUrl}" />`,
    '<meta property="og:image:type" content="image/png" />',
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${alt}" />`,
    `<meta name="twitter:image" content="${imageUrl}" />`,
    `<meta name="twitter:image:alt" content="${alt}" />`,
  ]

  let output = html
  for (const tag of tags) {
    const property = tag.match(/(?:property|name)="([^"]+)"/)?.[1]
    if (!property) continue
    output = output.replace(
      new RegExp(
        `\\s*<meta (?:property|name)="${property}"[^>]*\\/?>`,
        'g',
      ),
      '',
    )
  }

  output = output.replace(
    /<meta name="twitter:card" content="[^"]*" \/>/,
    '<meta name="twitter:card" content="summary_large_image" />',
  )

  return output.replace(
    '</head>',
    `    ${tags.join('\n    ')}\n  </head>`,
  )
}

const fileEnv = loadEnv('production', projectRoot, 'VITE_')
const siteUrl = resolveSiteUrl(
  {
    VITE_SITE_URL: process.env.VITE_SITE_URL || fileEnv.VITE_SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL:
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
  },
  { allowVercelFallback: true },
)
await mkdir(outDir, { recursive: true })

if (!siteUrl) {
  const emptySitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>
`
  await writeFile(path.join(outDir, 'sitemap.xml'), emptySitemap)
  console.warn(
    'Sitemap generated without URLs: configure VITE_SITE_URL or deploy with VERCEL_PROJECT_PRODUCTION_URL.',
  )
} else {
  const urls = publicPages
    .map((page) => {
      const url = new URL(page.path, `${siteUrl}/`).toString()
      const lastmod = page.lastmod
        ? `\n    <lastmod>${escapeXml(page.lastmod)}</lastmod>`
        : ''

      return `  <url>\n    <loc>${escapeXml(url)}</loc>${lastmod}\n  </url>`
    })
    .join('\n')

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
  await writeFile(path.join(outDir, 'sitemap.xml'), sitemap)

  const robotsPath = path.join(outDir, 'robots.txt')
  const robots = await readFile(robotsPath, 'utf8').catch(() => '')
  if (robots && !/^Sitemap:\s*/m.test(robots)) {
    await writeFile(
      robotsPath,
      `${robots.trimEnd()}\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
    )
  }

  const indexPath = path.join(outDir, 'index.html')
  const html = await readFile(indexPath, 'utf8').catch(() => '')
  if (html) {
    await writeFile(indexPath, injectSocialImage(html, siteUrl))
  }

  console.log(`Sitemap generated with ${publicPages.length} public URLs.`)
}
