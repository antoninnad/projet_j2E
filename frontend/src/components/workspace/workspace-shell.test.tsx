import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { WorkspaceShell } from "@/components/workspace/workspace-shell"

describe("WorkspaceShell", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/dashboard")
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
  })

  it("affiche les 4 onglets accessibles avec l'onglet Documents actif par défaut", () => {
    render(<WorkspaceShell embedded userName="Alice Dupont" isAdmin />)

    expect(screen.getByRole("tablist", { name: /Modules de l'espace de travail/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Documents" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tab", { name: "Annuaire" })).toHaveAttribute("aria-selected", "false")
    expect(screen.getByRole("tab", { name: "Chat privé" })).toHaveAttribute("aria-selected", "false")
    expect(screen.getByRole("tab", { name: "Administration" })).toHaveAttribute("aria-selected", "false")
    expect(screen.getByText("Alice Dupont")).toBeInTheDocument()
    expect(screen.getByText("Admin")).toBeInTheDocument()
  })

  it("permet de naviguer entre les onglets et synchronise le paramètre ?tab=", async () => {
    const user = userEvent.setup()
    render(<WorkspaceShell embedded />)

    await user.click(screen.getByRole("tab", { name: "Annuaire" }))
    expect(screen.getByRole("tab", { name: "Annuaire" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByText(/Annuaire et profils de l'entreprise/i)).toBeInTheDocument()
    expect(window.location.search).toBe("?tab=directory")

    await user.click(screen.getByRole("tab", { name: "Chat privé" }))
    expect(screen.getByText(/Chat privé en temps réel/i)).toBeInTheDocument()
    expect(window.location.search).toBe("?tab=chat")

    await user.click(screen.getByRole("tab", { name: "Administration" }))
    expect(await screen.findByText(/Demandes d'inscription en attente/i)).toBeInTheDocument()
    expect(window.location.search).toBe("?tab=admin")
  })

  it("respecte initialTab lorsqu'aucun paramètre ?tab= n'est dans l'URL", () => {
    render(<WorkspaceShell embedded initialTab="chat" />)

    expect(screen.getByRole("tab", { name: "Chat privé" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByText(/Chat privé en temps réel/i)).toBeInTheDocument()
  })

  it("réagit à l'événement navigateur popstate (précédent/suivant)", async () => {
    render(<WorkspaceShell embedded />)

    act(() => {
      window.history.replaceState({}, "", "/dashboard?tab=directory")
      window.dispatchEvent(new PopStateEvent("popstate"))
    })

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Annuaire" })).toHaveAttribute("aria-selected", "true")
    })
  })
})
