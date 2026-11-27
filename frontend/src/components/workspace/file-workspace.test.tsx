import { act, fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { FileWorkspace } from "./file-workspace"
import { createApi } from "@/lib/api"
import { paginate } from "@/lib/pagination"
import type { UploadProgress } from "@/lib/upload-request"
import type { DocumentNode, NodeDetail } from "@/types/api"

const finance: DocumentNode = {
  id: 10,
  name: "Finance",
  kind: "folder",
  departmentId: 2,
  departmentName: "Finance",
  minAccessLevel: 0,
  owner: { id: 7, firstName: "Alice", lastName: "Martin" },
  createdAt: "2026-11-25T09:00:00Z",
  version: 0,
  permissions: { view: true, modify: true, delete: true, manage: true, createChild: true },
}

const report: DocumentNode = {
  ...finance,
  id: 20,
  name: "budget.pdf",
  kind: "file",
  parentId: finance.id,
  size: 2048,
  contentType: "application/pdf",
  permissions: { view: true, modify: false, delete: false, manage: false, createChild: false },
}

const financePath = [{ id: finance.id, name: finance.name }]
const reportDetail: NodeDetail = { node: report, path: financePath }
const archives: DocumentNode = { ...finance, id: 11, name: "Archives" }
const projects: DocumentNode = { ...finance, id: 12, name: "Projets", parentId: finance.id }

function financePage(page: number) {
  return Response.json({
    items: page === 0 ? [report] : [{ ...report, id: 21, name: "suivi.pdf" }],
    page: { page, size: 6, totalElements: 7, totalPages: 2, first: page === 0, last: page === 1 },
  })
}

function explore(url: string): Response {
  if (url === "/api/folders/roots") return Response.json([finance])
  if (url === "/api/folders/10/children?page=0&size=6") return financePage(0)
  if (url === "/api/nodes/10") return Response.json({ node: finance, path: [] })
  if (url === "/api/nodes/20") return Response.json(reportDetail)
  if (url === "/api/files/20/content") {
    return new Response("Budget", { headers: { "Content-Type": "text/plain" } })
  }
  throw new Error("Unexpected route: " + url)
}

describe("FileWorkspace", () => {
  it("navigue dans l'API, pagine et affiche les droits de l'élément sélectionné", async () => {
    const user = userEvent.setup()
    const nextPageUrl = "/api/folders/10/children?page=1&size=6"
    let resolvePage!: (response: Response) => void
    const pending = new Promise<Response>(resolve => { resolvePage = resolve })
    const fetcher = vi.fn(async (url: string) => url === nextPageUrl ? pending : explore(url))
    render(<FileWorkspace client={createApi({ fetcher })} embedded />)

    await user.click(await screen.findByRole("button", { name: "Ouvrir le dossier Finance" }))
    const details = within(screen.getByRole("region", { name: "Détails du document" }))
    expect(await details.findByText("Gérer le partage")).toBeInTheDocument()
    expect(details.queryByRole("button", { name: "Partager" })).not.toBeInTheDocument()
    expect(details.getByText("Créer dans ce dossier")).toBeInTheDocument()
    const pdf = await screen.findByRole("button", { name: "Ouvrir le fichier budget.pdf" })
    await user.click(pdf)
    expect(await details.findByText("application/pdf")).toBeInTheDocument()
    expect(await details.findByText("Budget")).toBeInTheDocument()
    expect(details.getByText("2.0 Ko")).toBeInTheDocument()
    expect(details.getByText("Consulter")).toBeInTheDocument()
    expect(details.queryByText("Supprimer")).not.toBeInTheDocument()
    expect(details.queryByRole("button", { name: "Partager" })).not.toBeInTheDocument()

    const breadcrumb = within(screen.getByRole("navigation", { name: "Fil d'Ariane" }))
    expect(breadcrumb.getByText("budget.pdf")).toHaveAttribute("aria-current", "page")
    const next = screen.getByRole("button", { name: "Page suivante" })
    next.focus()
    await user.keyboard("{Enter}")
    expect(next).toHaveFocus()
    expect(next).toHaveAttribute("aria-disabled", "true")
    await user.keyboard("{Enter}")
    await act(async () => resolvePage(financePage(1)))

    expect(await screen.findByRole("button", { name: "Ouvrir le fichier suivi.pdf" })).toBeInTheDocument()
    expect(next).toHaveFocus()
    expect(next).toHaveAttribute("aria-disabled", "true")
    expect(fetcher).toHaveBeenCalledWith("/api/folders/10/children?page=0&size=6", expect.anything())
    expect(fetcher.mock.calls.filter(([url]) => url === nextPageUrl)).toHaveLength(1)

    await user.click(breadcrumb.getByRole("button", { name: "Finance" }))
    expect(await screen.findByRole("button", { name: "Ouvrir le fichier budget.pdf" })).toBeInTheDocument()
    await user.click(breadcrumb.getByRole("button", { name: "Départements" }))
    expect(await screen.findByRole("button", { name: "Ouvrir le dossier Finance" })).toBeInTheDocument()
  })

  it("permet de relancer le chargement après une erreur serveur", async () => {
    const user = userEvent.setup()
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json({ code: "FORBIDDEN", message: "Accès refusé." }, { status: 403 }))
      .mockResolvedValueOnce(Response.json([]))
    render(<FileWorkspace client={createApi({ fetcher })} />)

    expect(await screen.findByRole("alert")).toHaveTextContent("Accès refusé.")
    await user.click(screen.getByRole("button", { name: "Réessayer" }))
    expect(await screen.findByText("Aucun dossier de département accessible.")).toBeInTheDocument()
  })

  it("ignore les détails d'un fichier après un retour aux départements", async () => {
    const user = userEvent.setup()
    let resolveReport!: (response: Response) => void
    const pending = new Promise<Response>(resolve => { resolveReport = resolve })
    const fetcher = vi.fn(async (url: string) => url === "/api/nodes/20" ? pending : explore(url))
    render(<FileWorkspace client={createApi({ fetcher })} />)

    await user.click(await screen.findByRole("button", { name: "Ouvrir le dossier Finance" }))
    await user.click(await screen.findByRole("button", { name: "Ouvrir le fichier budget.pdf" }))
    const breadcrumb = within(screen.getByRole("navigation", { name: "Fil d'Ariane" }))
    await user.click(breadcrumb.getByRole("button", { name: "Départements" }))
    await act(async () => resolveReport(Response.json(reportDetail)))

    expect(await screen.findByRole("button", { name: "Ouvrir le dossier Finance" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "budget.pdf" })).not.toBeInTheDocument()
  })

  it("crée, renomme, déplace et supprime un dossier avec la version du serveur", async () => {
    const user = userEvent.setup()
    let child: DocumentNode | undefined
    const fetcher = vi.fn(async (url: string, init: RequestInit) => {
      if (url === "/api/folders/roots") return Response.json([finance, archives])
      if (url === "/api/nodes/10") return Response.json({ node: finance, path: [] })
      if (url === "/api/nodes/11") return Response.json({ node: archives, path: [] })
      if (url === "/api/nodes/12" && child) {
        return Response.json({ node: child, path: [child.parentId === 10 ? finance : archives] })
      }
      const children = /^\/api\/folders\/(\d+)\/children\?/.exec(url)
      if (children) {
        return Response.json(paginate(child?.parentId === Number(children[1]) && child ? [child] : []))
      }
      if (url === "/api/folders" && init.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({ parentId: 10, name: "Projets" })
        child = projects
        return Response.json(child, { status: 201 })
      }
      if (url === "/api/folders/12" && init.method === "PATCH") {
        expect(JSON.parse(String(init.body))).toEqual({ name: "Dossiers", version: 0 })
        child = { ...projects, name: "Dossiers", version: 1 }
        return Response.json(child)
      }
      if (url === "/api/nodes/12/move" && init.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({ targetFolderId: 11, version: 1 })
        child = { ...projects, name: "Dossiers", parentId: 11, version: 2 }
        return Response.json(child)
      }
      if (url === "/api/folders/12?version=2" && init.method === "DELETE") {
        child = undefined
        return new Response(null, { status: 204 })
      }
      throw new Error("Unexpected route: " + url)
    })
    render(<FileWorkspace client={createApi({ fetcher })} />)

    await user.click(await screen.findByRole("button", { name: "Ouvrir le dossier Finance" }))
    await user.click(await screen.findByRole("button", { name: "Nouveau dossier" }))
    let dialog = within(screen.getByRole("dialog"))
    await user.type(dialog.getByLabelText("Nom du dossier"), "Projets")
    await user.click(dialog.getByRole("button", { name: "Créer" }))
    await user.click(await screen.findByRole("button", { name: "Ouvrir le dossier Projets" }))
    await user.click(await screen.findByRole("button", { name: "Renommer le dossier" }))

    dialog = within(screen.getByRole("dialog"))
    const nameInput = dialog.getByLabelText("Nom du dossier")
    await user.clear(nameInput)
    await user.type(nameInput, "Dossiers")
    await user.click(dialog.getByRole("button", { name: "Renommer" }))
    await user.click(await screen.findByRole("button", { name: "Déplacer le dossier" }))

    dialog = within(screen.getByRole("dialog"))
    await user.click(await dialog.findByRole("button", { name: "Finance" }))
    expect(await dialog.findByText("Aucun dossier ici.")).toBeInTheDocument()
    expect(dialog.getByRole("button", { name: "Choisir ce dossier" })).toBeDisabled()
    await user.click(dialog.getByRole("button", { name: "Dossier parent" }))
    await user.click(await dialog.findByRole("button", { name: "Archives" }))
    await user.click(dialog.getByRole("button", { name: "Choisir ce dossier" }))
    await user.click(dialog.getByRole("button", { name: "Déplacer" }))

    const breadcrumb = within(screen.getByRole("navigation", { name: "Fil d'Ariane" }))
    await user.click(await breadcrumb.findByRole("button", { name: "Départements" }))
    await user.click(await screen.findByRole("button", { name: "Ouvrir le dossier Archives" }))
    await user.click(await screen.findByRole("button", { name: "Ouvrir le dossier Dossiers" }))
    await user.click(await screen.findByRole("button", { name: "Supprimer le dossier" }))
    dialog = within(screen.getByRole("dialog"))
    expect(dialog.getByText(/tout son contenu/)).toBeInTheDocument()
    await user.click(dialog.getByRole("button", { name: "Annuler" }))
    expect(fetcher.mock.calls.some(([, init]) => init.method === "DELETE")).toBe(false)
    await user.click(screen.getByRole("button", { name: "Supprimer le dossier" }))
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Supprimer" }))

    expect(await screen.findByText("Ce dossier est vide.")).toBeInTheDocument()
  })

  it("affiche la progression de l'import et le refus d'un doublon", async () => {
    const user = userEvent.setup()
    let complete!: (response: Response) => void
    const pending = new Promise<Response>(resolve => { complete = resolve })
    let uploaded = false
    const file = new File(["budget"], report.name, { type: "application/pdf" })
    const fetcher = vi.fn(async (url: string, init: RequestInit, progress?: UploadProgress) => {
      if (url === "/api/folders/10/files") {
        expect(init.method).toBe("POST")
        expect((init.body as FormData).get("file")).toMatchObject({ name: report.name, size: file.size })
        expect(new Headers(init.headers).has("Content-Type")).toBe(false)
        if (uploaded) return Response.json({ code: "CONFLICT", message: "Ce fichier existe déjà." }, { status: 409 })
        progress?.(50)
        const response = await pending
        uploaded = true
        return response
      }
      if (url.includes("/children")) return Response.json(paginate(uploaded ? [report] : []))
      return explore(url)
    })
    render(<FileWorkspace client={createApi({ fetcher })} />)

    await user.click(await screen.findByRole("button", { name: "Ouvrir le dossier Finance" }))
    const importButton = await screen.findByRole("button", { name: "Importer un fichier" })
    await user.upload(screen.getByLabelText("Choisir un fichier"), file)
    expect(await screen.findByRole("progressbar", { name: "Progression de l'import" })).toHaveValue(50)
    expect(importButton).toBeDisabled()
    await act(async () => complete(Response.json(report, { status: 201 })))
    expect(await screen.findByRole("button", { name: "Ouvrir le fichier budget.pdf" })).toBeInTheDocument()

    fireEvent.drop(screen.getByText("Ou glissez un fichier ici."), { dataTransfer: { files: [file] } })
    expect(await screen.findByRole("alert")).toHaveTextContent("Ce fichier existe déjà.")
  })

  it("masque les actions d'écriture sans permission de création ou de modification", async () => {
    const user = userEvent.setup()
    const readOnly = { ...projects, permissions: report.permissions }
    const fetcher = vi.fn(async (url: string) => {
      if (url === "/api/nodes/12") return Response.json({ node: readOnly, path: financePath })
      if (url.includes("/folders/10/children?")) return Response.json(paginate([readOnly]))
      if (url.includes("/folders/12/children?")) return Response.json(paginate([]))
      return explore(url)
    })
    render(<FileWorkspace client={createApi({ fetcher })} />)

    await user.click(await screen.findByRole("button", { name: "Ouvrir le dossier Finance" }))
    await user.click(await screen.findByRole("button", { name: "Ouvrir le dossier Projets" }))
    expect(await screen.findByText("Consulter")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Nouveau dossier" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Importer un fichier" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Renommer|Déplacer|Supprimer/ })).not.toBeInTheDocument()
  })
})
