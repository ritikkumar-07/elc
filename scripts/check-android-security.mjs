import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const androidRoot = 'frontend/android'

if (!existsSync(androidRoot)) {
  console.log(
    'Android project not present in this checkout; security check skipped.',
  )
  process.exit(0)
}

const manifestPath = path.join(
  androidRoot,
  'app/src/main/AndroidManifest.xml',
)
const filePathsPath = path.join(
  androidRoot,
  'app/src/main/res/xml/file_paths.xml',
)
const networkConfigPath = path.join(
  androidRoot,
  'app/src/main/res/xml/network_security_config.xml',
)
const gradlePath = path.join(androidRoot, 'app/build.gradle')

const problems = []

function read(filePath, label) {
  if (!existsSync(filePath)) {
    problems.push(`${label} is missing`)
    return ''
  }

  return readFileSync(filePath, 'utf8')
}

const manifest = read(manifestPath, 'AndroidManifest.xml')
const filePaths = read(filePathsPath, 'file_paths.xml')
const networkConfig = read(
  networkConfigPath,
  'network_security_config.xml',
)
const gradle = read(gradlePath, 'app/build.gradle')

if (!/android:allowBackup="false"/.test(manifest)) {
  problems.push('App backups must be disabled')
}

if (!/android:fullBackupContent="false"/.test(manifest)) {
  problems.push('Full backup content must be disabled')
}

if (!/android:usesCleartextTraffic="false"/.test(manifest)) {
  problems.push('Cleartext traffic must be disabled')
}

if (
  !/android:networkSecurityConfig="@xml\/network_security_config"/.test(
    manifest,
  )
) {
  problems.push('A network security config must be referenced')
}

if (
  /android:debuggable="true"/.test(manifest) ||
  /android:usesCleartextTraffic="true"/.test(manifest)
) {
  problems.push('Debug or cleartext settings are enabled')
}

if (
  /<external-path\b|<external-cache-path\b|<external-files-path\b|<root-path\b|<files-path\b/.test(
    filePaths,
  )
) {
  problems.push(
    'FileProvider must not expose external, root, or files-directory paths',
  )
}

if (
  /path="(?:\.|\/)"/.test(filePaths) ||
  /path=""\s*\/>/.test(filePaths)
) {
  problems.push('FileProvider must not expose a broad root path')
}

if (
  !/<base-config cleartextTrafficPermitted="false">/.test(
    networkConfig,
  )
) {
  problems.push(
    'The network security config must deny cleartext traffic',
  )
}

if (problems.length > 0) {
  for (const issue of problems) {
    console.error(`Android security check: ${issue}`)
  }
  process.exit(1)
}

console.log('Android security check passed.')

if (!/minifyEnabled\s+true/.test(gradle)) {
  console.warn(
    'Warning: release minification is disabled. This remains an unresolved release-hardening item.',
  )
}

if (!/signingConfigs\s*\{/.test(gradle)) {
  console.warn(
    'Warning: no release signing configuration is present in app/build.gradle.',
  )
}
