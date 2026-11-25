import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const staticUiDir = resolve(process.cwd(), '../src/main/resources/static/ui')
const requiredFiles = ['app.js', 'app.css', 'favicon.svg']
const errors = []

for (const file of requiredFiles) {
  const fullPath = resolve(staticUiDir, file)
  if (!existsSync(fullPath)) {
    errors.push(`Fichier de build manquant : ${fullPath}`)
    continue
  }
  if (statSync(fullPath).size === 0) {
    errors.push(`Fichier de build vide : ${fullPath}`)
  }
}

const cssPath = resolve(staticUiDir, 'app.css')
if (existsSync(cssPath)) {
  const css = readFileSync(cssPath, 'utf8')
  // Classes utilisées spécifiquement dans les templates Thymeleaf (fragments/messages.html, register.html)
  const expectedTemplateClasses = ['bg-success-subtle', 'bg-warning-subtle', 'bg-destructive-subtle', 'max-w-lg']
  for (const cls of expectedTemplateClasses) {
    if (!css.includes(cls)) {
      errors.push(
        `Classe Tailwind Thymeleaf absente de app.css : "${cls}" (vérifier @source dans src/styles.css)`,
      )
    }
  }
}

if (errors.length > 0) {
  console.error('[frontend-ci] Vérification du bundle échouée :')
  for (const err of errors) {
    console.error(`  - ${err}`)
  }
  process.exit(1)
}

console.log('[frontend-ci] Bundle static/ui vérifié (app.js, app.css + scan Tailwind Thymeleaf, favicon.svg).')
