function normalizeCell(value) {
  if (value === null || value === undefined) return ''
  return String(value)
}

export function escapeCsvCell(value) {
  let text = normalizeCell(value)

  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`
  }

  if (/[",\r\n]/.test(text)) {
    text = `"${text.replaceAll('"', '""')}"`
  }

  return text
}

export function downloadCsv(filename, headers, rows) {
  const lines = [
    headers.map((header) => escapeCsvCell(header)).join(','),
    ...rows.map((row) =>
      row.map((cell) => escapeCsvCell(cell)).join(','),
    ),
  ]
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], {
    type: 'text/csv;charset=utf-8',
  })
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename.endsWith('.csv')
    ? filename
    : `${filename}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(url)
}

export function safeFileName(value, fallback = 'elc-results') {
  const cleaned = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  return `${cleaned || fallback}.csv`
}
