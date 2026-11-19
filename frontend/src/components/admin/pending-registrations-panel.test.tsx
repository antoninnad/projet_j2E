import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { PendingRegistrationsPanel } from "@/components/admin/pending-registrations-panel"

const sampleUsers = [
  {
    id: 10,
    username: "alice.dupont",
    firstName: "Alice",
    lastName: "Dupont",
    email: "alice@acme.fr",
  },
  {
    id: 11,
    username: "bob.martin",
    email: "bob@acme.fr",
  },
]

describe("PendingRegistrationsPanel", () => {
  it("affiche un état vide explicite lorsqu'aucune demande n'est en attente", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )

    render(<PendingRegistrationsPanel />)

    expect(await screen.findByText("Aucune demande en attente")).toBeInTheDocument()
    expect(screen.getByText("0 en attente")).toBeInTheDocument()
  })

  it("affiche la liste des demandes et permet d'approuver un compte", async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(sampleUsers), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))

    render(<PendingRegistrationsPanel />)

    expect(await screen.findByText("Alice Dupont")).toBeInTheDocument()
    expect(screen.getByText("bob.martin")).toBeInTheDocument()
    expect(screen.getByText("2 en attente")).toBeInTheDocument()

    const approveButtons = screen.getAllByRole("button", { name: "Approuver" })
    await user.click(approveButtons[0])

    await waitFor(() => {
      expect(screen.queryByText("Alice Dupont")).not.toBeInTheDocument()
    })
    expect(screen.getByText("1 en attente")).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/users/10/approve",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    )
  })

  it("permet de refuser une demande d'inscription", async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify([sampleUsers[0]]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    render(<PendingRegistrationsPanel />)

    await screen.findByText("Alice Dupont")
    await user.click(screen.getByRole("button", { name: "Refuser" }))

    await waitFor(() => {
      expect(screen.getByText("Aucune demande en attente")).toBeInTheDocument()
    })
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/users/10/decline",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    )
  })

  it("affiche une alerte claire en cas de refus d'accès (403) puis recharge au clic sur Actualiser", async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify([sampleUsers[0]]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )

    render(<PendingRegistrationsPanel />)

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent(/Accès administrateur requis/i)

    await user.click(screen.getByRole("button", { name: "Actualiser" }))
    expect(await screen.findByText("Alice Dupont")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})
