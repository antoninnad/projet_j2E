import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { describe, expect, it } from "vitest"

const frontendDir = resolve(process.cwd())
const repoRoot = resolve(frontendDir, "..")

function collectFiles(dir: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath))
    } else {
      results.push(fullPath)
    }
  }
  return results
}

describe("Contrats CI & socle frontend (T02 / T10)", () => {
  it("package.json exige Node >= 22.12.0 et expose tous les scripts CI T10", () => {
    const pkg = JSON.parse(readFileSync(resolve(frontendDir, "package.json"), "utf8")) as {
      engines?: { node?: string }
      scripts?: Record<string, string>
    }

    expect(pkg.engines?.node).toBe(">=22.12.0")
    expect(pkg.scripts).toMatchObject({
      "check:node": expect.any(String),
      "check:bundle": expect.any(String),
      lint: expect.any(String),
      typecheck: expect.any(String),
      test: expect.any(String),
      build: expect.any(String),
      ci: expect.any(String),
    })
  })

  it("interdit la réintroduction de fichiers .jsx obsolètes dans frontend/src", () => {
    const files = collectFiles(resolve(frontendDir, "src"))
    const jsxFiles = files.filter((file) => file.endsWith(".jsx"))
    expect(jsxFiles).toEqual([])
  })

  it("styles.css conserve @source vers les templates Thymeleaf pour unifier Tailwind v4", () => {
    const css = readFileSync(resolve(frontendDir, "src/styles.css"), "utf8")
    expect(css).toContain('@source "../../src/main/resources/templates";')
  })

  it("les 4 pages Thymeleaf du socle existent et réutilisent les fragments communs", () => {
    const templatesDir = resolve(repoRoot, "src/main/resources/templates")
    for (const page of ["index.html", "login.html", "register.html", "dashboard.html"]) {
      const content = readFileSync(resolve(templatesDir, page), "utf8")
      expect(content, `${page} doit inclure fragments/head`).toContain("fragments/head")
      expect(content, `${page} doit inclure fragments/header`).toContain("fragments/header")
      expect(content, `${page} doit inclure fragments/messages`).toContain("fragments/messages")
      expect(content, `${page} doit inclure fragments/footer`).toContain("fragments/footer")
    }

    const dashboardHtml = readFileSync(resolve(templatesDir, "dashboard.html"), "utf8")
    expect(dashboardHtml).toContain('data-react-mount="workspace"')
  })

  it("le workflow GitHub Actions T10 existe et exécute lint, typecheck, tests et build sous Node 22", () => {
    const workflowPath = resolve(repoRoot, ".github/workflows/frontend-ci.yml")
    expect(existsSync(workflowPath)).toBe(true)

    const yaml = readFileSync(workflowPath, "utf8")
    expect(yaml).toContain("frontend/.nvmrc")
    expect(yaml).toContain("npm ci")
    expect(yaml).toContain("npm run lint")
    expect(yaml).toContain("npm run typecheck")
    expect(yaml).toContain("npm run test:coverage")
    expect(yaml).toContain("npm run build")
    expect(yaml).toContain("npm run check:bundle")
  })
})
