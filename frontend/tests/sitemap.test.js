import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import publicPages from '../src/data/publicPages.js'

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

test('sitemap generation includes every public page and wires robots.txt', async () => {
  const outDir = await mkdtemp(path.join(tmpdir(), 'elc-sitemap-'))

  try {
    await writeFile(
      path.join(outDir, 'robots.txt'),
      'User-agent: *\nAllow: /\n# A Sitemap: line is added at build time.\n',
    )
    await writeFile(
      path.join(outDir, 'index.html'),
      '<html><head><meta name="twitter:card" content="summary" /></head></html>',
    )

    const result = spawnSync(
      process.execPath,
      ['scripts/generate-sitemap.mjs', outDir],
      {
        cwd: projectRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          VITE_SITE_URL: 'https://example.com',
        },
      },
    )

    assert.equal(result.status, 0, result.stderr)

    const sitemap = await readFile(path.join(outDir, 'sitemap.xml'), 'utf8')
    const robots = await readFile(path.join(outDir, 'robots.txt'), 'utf8')
    const html = await readFile(path.join(outDir, 'index.html'), 'utf8')

    assert.equal((sitemap.match(/<url>/g) || []).length, publicPages.length)

    for (const page of publicPages) {
      assert.match(sitemap, new RegExp(`<loc>https://example\\.com${page.path}</loc>`))
      assert.match(sitemap, new RegExp(`<lastmod>${page.lastmod}</lastmod>`))
    }

    assert.match(robots, /Sitemap: https:\/\/example\.com\/sitemap\.xml/)
    assert.match(html, /og:image" content="https:\/\/example\.com\/og-image\.png"/)
    assert.match(html, /twitter:card" content="summary_large_image"/)
    assert.doesNotMatch(sitemap, /\/(admin|teacher|student|login|register)/)
  } finally {
    await rm(outDir, { recursive: true, force: true })
  }
})

test('sitemap generation falls back to the Vercel production URL', async () => {
  const outDir = await mkdtemp(path.join(tmpdir(), 'elc-sitemap-vercel-'))

  try {
    const result = spawnSync(
      process.execPath,
      ['scripts/generate-sitemap.mjs', outDir],
      {
        cwd: projectRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          VITE_SITE_URL: '',
          VERCEL_PROJECT_PRODUCTION_URL: 'elc.vercel.app',
        },
      },
    )

    assert.equal(result.status, 0, result.stderr)

    const sitemap = await readFile(path.join(outDir, 'sitemap.xml'), 'utf8')

    assert.match(sitemap, /<loc>https:\/\/elc\.vercel\.app\/contact<\/loc>/)
    assert.equal((sitemap.match(/<url>/g) || []).length, publicPages.length)
  } finally {
    await rm(outDir, { recursive: true, force: true })
  }
})
