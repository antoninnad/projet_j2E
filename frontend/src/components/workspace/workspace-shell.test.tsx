import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import App from "@/App"
import { WorkspaceShell } from "@/components/workspace/workspace-shell"
import { paginate } from "@/lib/pagination"

describe("WorkspaceShell", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/dashboard")
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
      if (url.includes("/api/auth/session")) {
        return Response.json({
          authenticated: true,
          user: {
            id: 1,
            companyId: 1,
            username: "alice.dupont",
            firstName: "Alice",
            lastName: "Dupont",
            email: "alice@example.com",
            status: "ACTIVE",
            role: "COMPANY_ADMIN",
          },
        })
      }
      if (url.includes("/api/profiles/me")) {
        return Response.json({ id: 1, bio: "", profilePictureUrl: null })
      }
      if (url.endsWith("/api/folders/roots")) return Response.json([])
      return Response.json(paginate([]))
    })
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

  it("masque l'onglet Administration à un membre simple et ignore ?tab=admin", () => {
    window.history.replaceState({}, "", "/dashboard?tab=admin")
    render(<WorkspaceShell embedded userName="Bob Martin" initialTab="admin" />)

    expect(screen.queryByRole("tab", { name: "Administration" })).not.toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Documents" })).toHaveAttribute("aria-selected", "true")
    expect(screen.queryByText(/Demandes d'inscription en attente/i)).not.toBeInTheDocument()
    expect(screen.queryByText("Admin")).not.toBeInTheDocument()
  })

  it("permet de naviguer entre les onglets et synchronise le paramètre ?tab=", async () => {
    const user = userEvent.setup()
    render(<WorkspaceShell embedded isAdmin />)

    await user.click(screen.getByRole("tab", { name: "Annuaire" }))
    expect(screen.getByRole("tab", { name: "Annuaire" })).toHaveAttribute("aria-selected", "true")
    expect(await screen.findByRole("textbox", { name: "Rechercher un collègue" })).toBeInTheDocument()
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

  it("permet d'approuver une inscription dans l'aperçu Vite sans backend", async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole("tab", { name: "Administration" }))
    expect(await screen.findByText("Sam Bernard")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Approuver" }))
    expect(await screen.findByText("Aucune demande en attente")).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("ouvre une conversation privée depuis l'annuaire et bascule sur l'onglet Chat privé (?tab=chat&peer=...)", async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole("tab", { name: "Annuaire" }))
    const messageButton = await screen.findByRole("button", { name: "Envoyer un message à Léa Dubois" })
    await user.click(messageButton)

    expect(screen.getByRole("tab", { name: "Chat privé" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByText(/Conversation privée avec Léa Dubois/i)).toBeInTheDocument()
    expect(window.location.search).toContain("tab=chat")
    expect(window.location.search).toContain("peer=3")
  })

  it("permet de réduire puis redéployer la barre latérale façon Teams", async () => {
    const user = userEvent.setup()
    render(<WorkspaceShell embedded userName="Alice Dupont" isAdmin />)

    const sidebar = screen.getByLabelText("Barre latérale d'application")
    expect(sidebar).toHaveAttribute("data-state", "expanded")

    await user.click(screen.getByRole("button", { name: "Réduire la barre latérale" }))
    expect(sidebar).toHaveAttribute("data-state", "collapsed")

    await user.click(screen.getByRole("button", { name: "Développer la barre latérale" }))
    expect(sidebar).toHaveAttribute("data-state", "expanded")
  })
})
