import process from 'node:process'

const MIN_MAJOR = 22
const MIN_MINOR = 12

const [major, minor, patch] = process.versions.node.split('.').map(Number)

const isSupported =
  major > MIN_MAJOR || (major === MIN_MAJOR && minor >= MIN_MINOR)

if (!isSupported) {
  console.error(
    `[frontend-ci] Node.js >= ${MIN_MAJOR}.${MIN_MINOR}.0 requis (détecté : v${major}.${minor}.${patch}).`,
  )
  console.error(
    'Activez Node 22 via nvm : export PATH="$HOME/.nvm/versions/node/v22.19.0/bin:$PATH" ou nvm use',
  )
  process.exit(1)
}

console.log(`[frontend-ci] Node.js v${major}.${minor}.${patch} OK (>= ${MIN_MAJOR}.${MIN_MINOR}.0)`)
