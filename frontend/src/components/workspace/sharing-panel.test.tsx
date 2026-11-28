import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { SharingPanel } from "@/components/workspace/sharing-panel"
import { createPreviewApi } from "@/data/api-preview"
import { paginate } from "@/lib/pagination"
import type { NodeSharingInfo } from "@/types/api"

describe("SharingPanel (T28)", () => {
  it("affiche le propriétaire, le seuil M, les contributeurs et applique les refus de seuil incohérent", async () => {
    const user = userEvent.setup()
    const client = createPreviewApi()
    render(<SharingPanel nodeId="guide" nodeName="guide-demarrage.md" client={client} />)

    expect(await screen.findByText(/Alice Martin/i)).toBeInTheDocument()
    expect(screen.getByText("Seuil actuel M = 1")).toBeInTheDocument()
    expect(screen.getByText(/Seuil parent ≥ 1/i)).toBeInTheDocument()
    expect(screen.getByText(/ne contourne jamais le seuil minimum M/i)).toBeInTheDocument()

    // Tentative de baisser M sous le seuil du parent (0 < 1) -> refus explicite
    const thresholdInput = screen.getByLabelText("Seuil minimum (M)")
    fireEvent.change(thresholdInput, { target: { value: "0" } })
    await user.click(screen.getByRole("button", { name: "Appliquer le seuil" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(/inférieur à celui de son dossier parent/i)

    // Hausse valide du seuil M -> 2
    fireEvent.change(thresholdInput, { target: { value: "2" } })
    await user.click(screen.getByRole("button", { name: "Appliquer le seuil" }))

    expect(await screen.findByText("Seuil actuel M = 2")).toBeInTheDocument()
  })

  it("permet d'ajouter puis retirer un contributeur sur un document", async () => {
    const user = userEvent.setup()
    const client = createPreviewApi()
    render(<SharingPanel nodeId="guide" nodeName="guide-demarrage.md" client={client} />)

    await screen.findByText("Contributeurs (2)")

    // Ajoute Inès Laurent (id = 5)
    fireEvent.change(screen.getByLabelText("Ajouter un contributeur"), {
      target: { value: "5" },
    })
    await user.click(screen.getByRole("button", { name: "Ajouter" }))

    expect(await screen.findByText("Contributeurs (3)")).toBeInTheDocument()
    expect(screen.getByText(/Inès Laurent/i)).toBeInTheDocument()

    // Retire Inès Laurent
    await user.click(screen.getByRole("button", { name: "Retirer le contributeur Inès Laurent" }))
    await waitFor(() => {
      expect(screen.getByText("Contributeurs (2)")).toBeInTheDocument()
    })
  })

  it("affiche le panneau en lecture seule avec explication si l'utilisateur n'a pas le droit de gérer le partage", async () => {
    const readOnlyInfo: NodeSharingInfo = {
      nodeId: "secret",
      nodeName: "rapport.pdf",
      departmentName: "Finance",
      owner: { id: 6, username: "lucas.moreau", firstName: "Lucas", lastName: "Moreau", email: "lucas@example.com" },
      minAccessLevel: 2,
      parentMinAccessLevel: 1,
      actorAccessLevel: 2,
      isCompanyAdmin: false,
      canManageSharing: false,
      contributors: [],
    }
    const mockClient = {
      getNodeSharing: vi.fn().mockResolvedValue(readOnlyInfo),
      updateNodeThreshold: vi.fn(),
      addNodeContributor: vi.fn(),
      removeNodeContributor: vi.fn(),
      listColleagues: vi.fn().mockResolvedValue(paginate([])),
    }

    render(<SharingPanel nodeId="secret" nodeName="rapport.pdf" client={mockClient} />)

    expect(await screen.findByText(/Consultation seule/i)).toBeInTheDocument()
    expect(screen.getByLabelText("Seuil minimum (M)")).toBeDisabled()
    expect(screen.getByRole("button", { name: "Appliquer le seuil" })).toBeDisabled()
    expect(screen.queryByLabelText("Ajouter un contributeur")).not.toBeInTheDocument()
  })
})
