import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { FileWorkspace } from "./file-workspace"
import { createApi } from "@/lib/api"
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
})
