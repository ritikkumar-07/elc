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

export function toCsv(headers, rows) {
  const lines = [
    headers.map((header) => escapeCsvCell(header)).join(','),
    ...rows.map((row) =>
      row.map((cell) => escapeCsvCell(cell)).join(','),
    ),
  ]

  return `\uFEFF${lines.join('\r\n')}`
}

export function csvFileName(value, fallback = 'elc-results') {
  const cleaned = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  return `${cleaned || fallback}.csv`
}
