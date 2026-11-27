import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ActivityFeedPanel } from "@/components/activity/activity-feed-panel"
import { DocumentDetails } from "@/components/workspace/document-details"
import { createPreviewApi } from "@/data/api-preview"
import { createApi } from "@/lib/api"
import { ApiError } from "@/lib/api-client"
import { paginate } from "@/lib/pagination"
import type { ActivityEntry, DocumentNode } from "@/types/api"

const sampleNode: DocumentNode = {
  id: 20,
  name: "guide-demarrage.md",
  kind: "file",
  parentId: 10,
  departmentId: 1,
  departmentName: "Finance",
  minAccessLevel: 1,
  owner: { id: 1, firstName: "Alice", lastName: "Martin" },
  createdAt: "2026-11-20T10:00:00Z",
  updatedAt: "2026-11-27T14:20:00Z",
  version: 3,
  originalFileName: "guide-demarrage.md",
  contentType: "application/octet-stream",
  size: 480,
  permissions: {
    view: true,
    modify: true,
    delete: false,
    manage: false,
    createChild: false,
  },
  favorite: false,
}

const sampleEntries: ActivityEntry[] = [
  {
    id: 101,
    action: "FOLDER_RENAMED",
    category: "DOCUMENT",
    label: "a renommé le dossier",
    occurredAt: "2026-11-27T15:00:00Z",
    actor: { id: 1, firstName: "Alice", lastName: "Martin" },
    nodeId: 10,
    nodeName: "Archives 2026",
    nodeKind: "folder",
    departmentId: 1,
    departmentName: "Finance",
    targetUserId: null,
    targetUserName: null,
    details: "« Archives » → « Archives 2026 »",
  },
  {
    id: 100,
    action: "DEPARTMENT_CREATED",
    category: "ADMINISTRATION",
    label: "a créé le département",
    occurredAt: "2026-11-26T09:00:00Z",
    actor: null,
    nodeId: null,
    nodeName: null,
    nodeKind: null,
    departmentId: 1,
    departmentName: "Finance",
    targetUserId: null,
    targetUserName: null,
    details: null,
  },
]

describe("ActivityFeedPanel & NodeActivitySection (T37)", () => {
  it("affiche le fil d'activité paginé, l'auteur plateforme et filtre par catégorie", async () => {
    const user = userEvent.setup()
    const client = createPreviewApi()
    render(<ActivityFeedPanel client={client} pageSize={4} />)

    // Page 1 sur 2 chargée depuis l'aperçu (8 entrées initiales, pageSize = 4)
    expect(await screen.findByText("8 opérations")).toBeInTheDocument()
    expect(screen.getByText("Page 1 / 2")).toBeInTheDocument()
    expect(screen.getByText("Léa Dubois")).toBeInTheDocument()
    expect(screen.getByText("a enregistré le fichier")).toBeInTheDocument()
    expect(screen.getByText(/Version 3 enregistrée/i)).toBeInTheDocument()
    expect(screen.getByText(/Membre concerné : Hugo Petit/i)).toBeInTheDocument()

    // Filtrage sur la catégorie Comptes & départements (aucune entrée sur la page 1 -> état vide de filtre)
    await user.click(screen.getByRole("tab", { name: "Comptes & départements" }))
    expect(
      await screen.findByText("Aucune opération dans cette catégorie sur cette page"),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Afficher toutes les catégories" }))
    expect(screen.getByText("Léa Dubois")).toBeInTheDocument()

    // Passage à la page 2 : vérifie le repli « Administrateur de plateforme » quand actor === null
    await user.click(screen.getByRole("button", { name: "Suivante" }))
    expect(await screen.findByText("Page 2 / 2")).toBeInTheDocument()
    expect(screen.getByText("Administrateur de plateforme")).toBeInTheDocument()
    expect(screen.getByText("Inès Laurent")).toBeInTheDocument()
  })

  it("gère l'état vide et la reprise sur erreur avec Réessayer", async () => {
    const user = userEvent.setup()
    const listActivity = vi
      .fn()
      .mockRejectedValueOnce(new Error("Service d'activité momentanément indisponible."))
      .mockResolvedValueOnce(paginate([]))

    render(<ActivityFeedPanel client={{ listActivity }} />)

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Service d'activité momentanément indisponible.")

    await user.click(screen.getByRole("button", { name: "Réessayer" }))
    expect(await screen.findByText("Aucune activité enregistrée")).toBeInTheDocument()
    expect(listActivity).toHaveBeenCalledTimes(2)
  })

  it("charge l'historique d'un document à la demande dans DocumentDetails et gère pagination et 404", async () => {
    const user = userEvent.setup()
    const fetcher = vi.fn(async (url: string) => {
      if (url === "/api/files/20/content") {
        return new Response(new Uint8Array([1, 2]), {
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": 'attachment; filename="guide-demarrage.md"',
          },
        })
      }
      if (url === "/api/nodes/20/activity?page=0&size=5") {
        return Response.json(paginate(sampleEntries, 0, 1))
      }
      if (url === "/api/nodes/20/activity?page=1&size=5") {
        return Response.json(paginate(sampleEntries, 1, 1))
      }
      throw new Error(`Unexpected route: ${url}`)
    })

    const client = createApi({ fetcher })
    render(
      <DocumentDetails
        node={sampleNode}
        client={client}
        editing={{ onDraftChange: vi.fn(), onSaved: vi.fn(), onReload: vi.fn() }}
        favoriteBusy={false}
        onToggleFavorite={vi.fn()}
        onNodeAction={vi.fn()}
      />,
    )

    // Tant que l'utilisateur n'ouvre pas la section, aucun appel /activity n'est émis
    expect(fetcher).not.toHaveBeenCalledWith(
      expect.stringContaining("/activity"),
      expect.anything(),
    )

    const toggleButton = screen.getByRole("button", { name: "Afficher l'historique" })
    expect(toggleButton).toHaveAttribute("aria-expanded", "false")
    await user.click(toggleButton)

    expect(await screen.findByText("Archives 2026")).toBeInTheDocument()
    expect(screen.getByText(/« Archives » → « Archives 2026 »/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Masquer l'historique" })).toHaveAttribute(
      "aria-expanded",
      "true",
    )

    await user.click(screen.getByRole("button", { name: "Suivante" }))
    expect(await screen.findByText("Administrateur de plateforme")).toBeInTheDocument()
  })

  it("affiche un message dédié lorsque l'élément n'est plus accessible (404) dans l'historique du nœud", async () => {
    const user = userEvent.setup()
    const listNodeActivity = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(404, { code: "NOT_FOUND", message: "Élément introuvable." }))
      .mockResolvedValueOnce(paginate([sampleEntries[0]]))

    const baseClient = createPreviewApi()
    render(
      <DocumentDetails
        node={{ ...sampleNode, kind: "folder", contentType: null, size: null }}
        client={{ ...baseClient, listNodeActivity }}
        editing={{ onDraftChange: vi.fn(), onSaved: vi.fn(), onReload: vi.fn() }}
        favoriteBusy={false}
        onToggleFavorite={vi.fn()}
        onNodeAction={vi.fn()}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Afficher l'historique" }))
    expect(
      await screen.findByText("L'historique de cet élément n'est plus accessible."),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Réessayer" }))
    await waitFor(() => {
      expect(screen.getByText("Archives 2026")).toBeInTheDocument()
    })
  })
})
