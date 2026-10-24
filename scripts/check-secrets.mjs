import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const MAX_FILE_BYTES = 1024 * 1024

const patterns = [
  {
    name: 'private key',
    regex:
      /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
  },
  {
    name: 'MongoDB URI credentials',
    regex:
      /mongodb(?:\+srv)?:\/\/(?!<)[^\s/:@]+:(?!<)[^\s/@]+@/i,
  },
  {
    name: 'AWS access key',
    regex: /\bAKIA[0-9A-Z]{16}\b/,
  },
  {
    name: 'GitHub token',
    regex: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  },
  {
    name: 'Slack token',
    regex: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
  },
  {
    name: 'Stripe live key',
    regex: /\bsk_live_[A-Za-z0-9]{20,}\b/,
  },
  {
    name: 'Google API key',
    regex: /\bAIza[0-9A-Za-z_-]{35}\b/,
  },
  {
    name: 'JWT',
    regex:
      /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
    allowPath: (filePath) =>
      filePath.startsWith('backend/tests/'),
  },
]

const tracked = execFileSync(
  'git',
  ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
  { encoding: 'utf8' },
)
  .split('\u0000')
  .filter(Boolean)

const findings = []

for (const relativePath of tracked) {
  let stats

  try {
    stats = statSync(relativePath)
  } catch {
    continue
  }

  if (!stats.isFile() || stats.size > MAX_FILE_BYTES) continue

  let content

  try {
    content = readFileSync(relativePath, 'utf8')
  } catch {
    continue
  }

  if (content.includes('\u0000')) continue

  const lines = content.split(/\r?\n/)

  for (const pattern of patterns) {
    if (pattern.allowPath?.(relativePath)) continue

    for (let index = 0; index < lines.length; index += 1) {
      if (!pattern.regex.test(lines[index])) continue

      findings.push({
        file: relativePath,
        line: index + 1,
        kind: pattern.name,
      })
      break
    }
  }
}

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(
      `Potential ${finding.kind} in ${finding.file}:${finding.line}`,
    )
  }

  console.error(
    `Secret scan failed with ${findings.length} finding(s). Values were not printed.`,
  )
  process.exit(1)
}

console.log(
  `Secret scan passed across ${tracked.length} tracked file(s).`,
)
console.log(
  `Skipped ignored files such as ${path.basename('.env')} and cookies.txt.`,
)
