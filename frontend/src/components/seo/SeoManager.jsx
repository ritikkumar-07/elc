import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import {
  absoluteUrl,
  getPageSeo,
  pageSeoDefaults,
} from '../../config/seo.js'

function setMeta(attribute, key, content) {
  const selector = `meta[${attribute}="${key}"]`
  let element = document.head.querySelector(selector)

  if (!content) {
    element?.remove()
    return
  }

  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }

  element.setAttribute('content', content)
}

function setCanonical(href) {
  let element = document.head.querySelector('link[rel="canonical"]')

  if (!href) {
    element?.remove()
    return
  }

  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', 'canonical')
    document.head.appendChild(element)
  }

  element.setAttribute('href', href)
}

export default function SeoManager() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    const seo = getPageSeo(pathname, hash)
    const canonical = seo.canonicalPath
      ? absoluteUrl(seo.canonicalPath)
      : ''
    const ogImage = canonical
      ? absoluteUrl(pageSeoDefaults.ogImagePath)
      : ''
    const ogImageAlt = `${pageSeoDefaults.siteName} brand card with location, telephone, and email.`

    document.title = seo.title

    setMeta('name', 'description', seo.description)
    setMeta('name', 'robots', seo.robots)
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:site_name', pageSeoDefaults.siteName)
    setMeta('property', 'og:title', seo.title)
    setMeta('property', 'og:description', seo.description)
    setMeta('property', 'og:url', canonical)
    setMeta('property', 'og:image', ogImage)
    setMeta('property', 'og:image:type', ogImage ? 'image/png' : '')
    setMeta('property', 'og:image:width', ogImage ? '1200' : '')
    setMeta('property', 'og:image:height', ogImage ? '630' : '')
    setMeta('property', 'og:image:alt', ogImage ? ogImageAlt : '')
    setMeta('name', 'twitter:card', ogImage ? 'summary_large_image' : 'summary')
    setMeta('name', 'twitter:title', seo.title)
    setMeta('name', 'twitter:description', seo.description)
    setMeta('name', 'twitter:image', ogImage)
    setMeta('name', 'twitter:image:alt', ogImage ? ogImageAlt : '')

    setCanonical(canonical)
  }, [pathname, hash])

  return null
}
