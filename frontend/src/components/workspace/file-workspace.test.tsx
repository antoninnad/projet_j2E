import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
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
  favorite: false,
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

const note: DocumentNode = {
  ...report,
  id: 22,
  name: "note.txt",
  contentType: "text/plain",
  permissions: { ...report.permissions, modify: true, delete: true },
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
    expect(details.queryByRole("button", { name: /Modifier le texte|Déplacer le fichier/ })).not.toBeInTheDocument()
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

  it("conserve le brouillon après un conflit et attend la validation de la version récente", async () => {
    const user = userEvent.setup()
    let version = 1
    let content = "Texte initial"
    const fetcher = vi.fn(async (url: string, init: RequestInit) => {
      if (url.includes("/folders/10/children?")) return Response.json(paginate([note, report]))
      if (url === "/api/nodes/22") {
        return Response.json({ node: { ...note, version: version === 1 ? 0 : version }, path: financePath })
      }
      if (url !== "/api/files/22/content") return explore(url)

      if (init.method === "PUT") {
        const payload = JSON.parse(String(init.body))
        expect(payload).toEqual({ content: "Mon brouillon", version })
        if (++version === 2) {
          content = "Texte concurrent"
          return Response.json({ code: "CONFLICT", message: "Le fichier a changé." }, { status: 409 })
        }
        content = payload.content
        return Response.json({ ...note, version })
      }
      return new Response(content, { headers: { "Content-Type": "text/plain", ETag: `"22-${version}"` } })
    })
    render(<FileWorkspace client={createApi({ fetcher })} />)

    await user.click(await screen.findByRole("button", { name: "Ouvrir le dossier Finance" }))
    const noteButton = { name: "Ouvrir le fichier note.txt" }
    const draftInput = { name: "Brouillon de note.txt" }
    await user.click(await screen.findByRole("button", noteButton))
    await user.click(await screen.findByRole("button", { name: "Modifier le texte" }))
    fireEvent.change(screen.getByRole("textbox", draftInput), { target: { value: "Mon brouillon" } })
    await user.click(screen.getByRole("button", { name: "Ouvrir le fichier budget.pdf" }))
    await user.click(screen.getByRole("button", noteButton))
    expect(await screen.findByRole("textbox", draftInput)).toHaveValue("Mon brouillon")

    await user.click(screen.getByRole("button", { name: "Enregistrer" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Le fichier a changé.")
    expect(screen.getByRole("textbox", draftInput)).toHaveValue("Mon brouillon")
    await user.click(screen.getByRole("button", { name: "Recharger la version récente" }))
    expect(await screen.findByLabelText("Dernière version du serveur")).toHaveTextContent("Texte concurrent")
    expect(screen.getByRole("textbox", draftInput)).toHaveValue("Mon brouillon")
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled()

    await user.click(screen.getByRole("button", { name: "Reprendre avec cette version" }))
    screen.getByRole("textbox", draftInput).focus()
    await user.keyboard("{Control>}s{/Control}")
    expect(await screen.findByText("Mon brouillon")).toBeInTheDocument()
    expect(screen.queryByRole("textbox", draftInput)).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Modifier le texte" }))
    fireEvent.change(screen.getByRole("textbox", draftInput), { target: { value: "À annuler" } })
    await user.click(screen.getByRole("button", { name: "Annuler le brouillon" }))
    expect(screen.getByText("Mon brouillon")).toBeInTheDocument()
    expect(fetcher.mock.calls.filter(([, init]) => init.method === "PUT")).toHaveLength(2)
  })

  it("remplace, déplace et supprime un fichier avec sa version courante", async () => {
    const user = userEvent.setup()
    let file: DocumentNode | undefined = { ...note, name: "archive.zip", contentType: "application/zip" }
    const replacement = new File(["binary"], "nouvelle.zip", { type: "application/zip" })
    const fetcher = vi.fn(async (url: string, init: RequestInit) => {
      if (url === "/api/folders/roots") return Response.json([finance, archives])
      if (url === "/api/nodes/11") return Response.json({ node: archives, path: [] })
      if (url === "/api/nodes/22" && file) {
        return Response.json({ node: file, path: [file.parentId === finance.id ? finance : archives] })
      }
      const children = /^\/api\/folders\/(\d+)\/children\?/.exec(url)
      if (children) return Response.json(paginate(file && file.parentId === Number(children[1]) ? [file] : []))
      if (url === "/api/files/22/content") {
        return new Response("binary", { headers: { "Content-Type": "application/octet-stream" } })
      }
      if (file && url === "/api/files/22/replace" && init.method === "POST") {
        const body = init.body as FormData
        expect(body.get("file")).toMatchObject({ name: replacement.name, size: replacement.size })
        expect(body.get("version")).toBe("0")
        file = { ...file, size: replacement.size, version: 1 }
        return Response.json(file)
      }
      if (file && url === "/api/nodes/22/move" && init.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({ targetFolderId: 11, version: 1 })
        file = { ...file, parentId: 11, version: 2 }
        return Response.json(file)
      }
      if (url === "/api/files/22?version=2" && init.method === "DELETE") {
        file = undefined
        return new Response(null, { status: 204 })
      }
      return explore(url)
    })
    render(<FileWorkspace client={createApi({ fetcher })} />)

    await user.click(await screen.findByRole("button", { name: "Ouvrir le dossier Finance" }))
    const fileButton = { name: "Ouvrir le fichier archive.zip" }
    await user.click(await screen.findByRole("button", fileButton))
    await user.upload(await screen.findByLabelText("Fichier de remplacement"), replacement)
    await user.click(screen.getByRole("button", { name: "Annuler le remplacement" }))
    expect(fetcher.mock.calls.some(([, init]) => init.method === "POST")).toBe(false)
    await user.upload(screen.getByLabelText("Fichier de remplacement"), replacement)
    await user.click(screen.getByRole("button", { name: "Confirmer le remplacement" }))
    const details = within(screen.getByRole("region", { name: "Détails du document" }))
    expect(await details.findByText("6 o")).toBeInTheDocument()
    await user.click(details.getByRole("button", { name: "Déplacer le fichier" }))

    let dialog = within(screen.getByRole("dialog"))
    await user.click(await dialog.findByRole("button", { name: "Archives" }))
    await user.click(dialog.getByRole("button", { name: "Choisir ce dossier" }))
    await user.click(dialog.getByRole("button", { name: "Déplacer" }))
    expect(await screen.findByText("Ce dossier est vide.")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Départements" }))
    await user.click(await screen.findByRole("button", { name: "Ouvrir le dossier Archives" }))
    await user.click(await screen.findByRole("button", fileButton))
    await user.click(await details.findByRole("button", { name: "Supprimer le fichier" }))
    dialog = within(screen.getByRole("dialog"))
    expect(dialog.getByText(/« archive.zip » sera supprimé/)).toBeInTheDocument()
    await user.click(dialog.getByRole("button", { name: "Annuler" }))
    expect(fetcher.mock.calls.some(([, init]) => init.method === "DELETE")).toBe(false)
    await user.click(details.getByRole("button", { name: "Supprimer le fichier" }))
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Supprimer" }))
    expect(await screen.findByText("Ce dossier est vide.")).toBeInTheDocument()
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

  it("recherche et pagine côté serveur, puis ouvre un dossier avec son chemin réel", async () => {
    const user = userEvent.setup()
    const budget = { ...projects, name: "Budget 2026", parentId: archives.id }
    const budgetPath = [...financePath, { id: archives.id, name: archives.name }]
    let replyToOldSearch!: (response: Response) => void
    const oldSearch = new Promise<Response>(resolve => { replyToOldSearch = resolve })
    let oldSignal: AbortSignal | null | undefined
    const requests: URLSearchParams[] = []
    const fetcher = vi.fn(async (url: string, init: RequestInit) => {
      if (url === "/api/nodes/12") return Response.json({ node: budget, path: budgetPath })
      if (url === "/api/folders/12/children?page=0&size=6") return Response.json(paginate([]))
      if (!url.startsWith("/api/search?")) return explore(url)

      const query = new URLSearchParams(url.split("?")[1])
      if (query.get("q") === "ancien") {
        oldSignal = init.signal
        return oldSearch
      }
      requests.push(query)
      const page = Number(query.get("page"))
      const node = query.get("kind") === "folder"
        ? page === 1 ? budget : { ...budget, id: 13, name: "Budget 2025" }
        : report
      return Response.json({
        items: [{ node, location: "Finance / Archives" }],
        page: { page, size: 6, totalElements: 7, totalPages: 2, first: page === 0, last: page === 1 },
      })
    })
    render(<FileWorkspace client={createApi({ fetcher })} />)
    await screen.findByRole("button", { name: "Ouvrir le dossier Finance" })

    const search = screen.getByRole("textbox", { name: "Rechercher dans les documents" })
    fireEvent.change(search, { target: { value: "ancien" } })
    const oldUrl = "/api/search?q=ancien&page=0&size=6"
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith(oldUrl, expect.anything()))
    fireEvent.change(search, { target: { value: "  budget  " } })
    expect(await screen.findByRole("button", { name: "Ouvrir le fichier budget.pdf (Finance / Archives)" })).toBeInTheDocument()
    await act(async () => replyToOldSearch(Response.json(paginate([{
      node: { ...report, name: "ancien.pdf" }, location: "Finance",
    }]))))
    expect(screen.queryByRole("button", { name: /ancien\.pdf/ })).not.toBeInTheDocument()
    expect(oldSignal?.aborted).toBe(true)

    await user.selectOptions(screen.getByRole("combobox", { name: "Type de document" }), "folder")
    await user.selectOptions(screen.getByRole("combobox", { name: "Département" }), "2")
    await screen.findByRole("button", { name: /Ouvrir le dossier Budget 2025/ })
    await user.click(screen.getByRole("button", { name: "Page suivante" }))
    await user.click(await screen.findByRole("button", { name: "Ouvrir le dossier Budget 2026 (Finance / Archives)" }))
    expect(Object.fromEntries(requests.at(-1)!)).toEqual({ q: "budget", kind: "folder", departmentId: "2", page: "1", size: "6" })

    const breadcrumb = within(screen.getByRole("navigation", { name: "Fil d'Ariane" }))
    expect(await breadcrumb.findByRole("button", { name: "Archives" })).toBeInTheDocument()
    expect(breadcrumb.getByText("Budget 2026")).toHaveAttribute("aria-current", "page")
    expect(search).toHaveValue("")
    expect(await screen.findByText("Ce dossier est vide.")).toBeInTheDocument()
  })

  it("ajoute et retire un favori persistant depuis les détails d'un fichier en lecture seule", async () => {
    const user = userEvent.setup()
    let favorite = false
    const fetcher = vi.fn(async (url: string, init: RequestInit) => {
      if (url === "/api/favorites/20" && init.method === "PUT") {
        favorite = true
        return Response.json({ ...report, favorite })
      }
      if (url === "/api/favorites/20" && init.method === "DELETE") {
        favorite = false
        return new Response(null, { status: 204 })
      }
      if (url === "/api/favorites?page=0&size=6") {
        const entry = { node: { ...report, favorite }, location: "Finance", addedAt: report.createdAt }
        return Response.json(paginate(favorite ? [entry] : [], 0, 6))
      }
      if (url === "/api/nodes/20") return Response.json({ ...reportDetail, node: { ...report, favorite } })
      return explore(url)
    })
    const client = createApi({ fetcher })
    const workspace = render(<FileWorkspace client={client} />)
    await user.click(await screen.findByRole("button", { name: "Ouvrir le dossier Finance" }))
    await user.click(await screen.findByRole("button", { name: "Ouvrir le fichier budget.pdf" }))
    await user.click(await screen.findByRole("button", { name: "Ajouter aux favoris" }))
    expect(await screen.findByRole("button", { name: "Retirer des favoris" })).toHaveAttribute("aria-pressed", "true")
    workspace.unmount()

    render(<FileWorkspace client={client} />)
    await user.click(screen.getByRole("button", { name: "Afficher les favoris" }))
    await user.click(await screen.findByRole("button", { name: "Ouvrir le fichier budget.pdf (Finance)" }))
    await user.click(await screen.findByRole("button", { name: "Retirer des favoris" }))
    expect(await screen.findByText("Aucun favori accessible.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Ajouter aux favoris" })).toHaveAttribute("aria-pressed", "false")
  })
})
