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

describe("Contrats CI & socle frontend (T02 / T03 / T10 / T13)", () => {
  it("package.json, .nvmrc et package-lock.json garantissent un build reproductible sous Node >= 22.12", () => {
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

    const nvmrc = readFileSync(resolve(frontendDir, ".nvmrc"), "utf8").trim()
    expect(nvmrc.startsWith("22")).toBe(true)
    expect(existsSync(resolve(frontendDir, "package-lock.json"))).toBe(true)
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

  it("les modules d'intégration API (T03) et de session/création d'entreprise (T13) sont présents", () => {
    for (const relPath of [
      "src/types/api.ts",
      "src/lib/api-client.ts",
      "src/lib/api.ts",
      "src/lib/pagination.ts",
      "src/lib/session.ts",
      "src/components/admin/company-creation-panel.tsx",
    ]) {
      expect(existsSync(resolve(frontendDir, relPath)), `${relPath} doit exister`).toBe(true)
    }
  })

  it("toutes les pages Thymeleaf d'accès et d'administration réutilisent les fragments communs, le CSRF et les îlots React", () => {
    const templatesDir = resolve(repoRoot, "src/main/resources/templates")
    const allPages = [
      "index.html",
      "login.html",
      "register.html",
      "dashboard.html",
      "admin-login.html",
      "admin-dashboard.html",
      "admin-dashboard-listUsers.html",
      "admin-dashboard-listDepartements.html",
      "admin-dashboard-listNodes.html",
      "admin-dashboard-listFiles.html",
    ]

    for (const page of allPages) {
      const content = readFileSync(resolve(templatesDir, page), "utf8")
      expect(content, `${page} doit inclure fragments/head`).toContain("fragments/head")
      expect(content, `${page} doit inclure fragments/header`).toContain("fragments/header")
      expect(content, `${page} doit inclure fragments/messages`).toContain("fragments/messages")
      expect(content, `${page} doit inclure fragments/footer`).toContain("fragments/footer")
    }

    const dashboardHtml = readFileSync(resolve(templatesDir, "dashboard.html"), "utf8")
    expect(dashboardHtml).toContain('data-react-mount="workspace"')
    expect(dashboardHtml).toContain("data-login-url")

    const adminDashboardHtml = readFileSync(resolve(templatesDir, "admin-dashboard.html"), "utf8")
    expect(adminDashboardHtml).toContain('data-react-mount="company-creation"')
    expect(adminDashboardHtml).toContain("fragments/admin-nav")
  })

  it("le workflow GitHub Actions T10 s'exécute automatiquement uniquement sur main sous Node 22", () => {
    const workflowPath = resolve(repoRoot, ".github/workflows/frontend-ci.yml")
    expect(existsSync(workflowPath)).toBe(true)

    const yaml = readFileSync(workflowPath, "utf8")
    expect(yaml).toMatch(/^\s{2}push:\s*\n\s{4}branches:\s*\[main\]/m)
    expect(yaml).toMatch(/^\s{2}pull_request:\s*\n\s{4}branches:\s*\[main\]/m)
    expect(yaml).toContain("frontend/.nvmrc")
    expect(yaml).toContain("npm ci")
    expect(yaml).toContain("npm run check:node")
    expect(yaml).toContain("npm run lint")
    expect(yaml).toContain("npm run typecheck")
    expect(yaml).toContain("npm run test:coverage")
    expect(yaml).toContain("npm run build")
    expect(yaml).toContain("npm run check:bundle")
  })
})
