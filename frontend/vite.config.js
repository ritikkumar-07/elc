import process from 'node:process'

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { normalizeSiteUrl } from './src/config/siteUrl.js'

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, import.meta.dirname, 'VITE_')
  const configuredSiteUrl = normalizeSiteUrl(
    process.env.VITE_SITE_URL || fileEnv.VITE_SITE_URL,
  )
  const vercelSiteUrl =
    mode === 'production'
      ? normalizeSiteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL)
      : ''
  const siteUrl = configuredSiteUrl || vercelSiteUrl

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    define:
      siteUrl && !configuredSiteUrl
        ? {
            'import.meta.env.VITE_SITE_URL': JSON.stringify(siteUrl),
          }
        : {},
  }
})
