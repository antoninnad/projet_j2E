import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { PendingRegistrationsPanel } from "@/components/admin/pending-registrations-panel"
import { paginate } from "@/lib/pagination"
import type { User } from "@/types/api"

const sampleUsers: User[] = [
  {
    id: 10,
    username: "alice.dupont",
    firstName: "Alice",
    lastName: "Dupont",
    email: "alice@acme.fr",
    companyId: 1,
    role: "MEMBER",
    status: "PENDING",
  },
  {
    id: 11,
    username: "bob.martin",
    firstName: "",
    lastName: "",
    email: "bob@acme.fr",
    companyId: 1,
    role: "MEMBER",
    status: "PENDING",
  },
]

describe("PendingRegistrationsPanel", () => {
  it("affiche un état vide explicite lorsqu'aucune demande n'est en attente", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(paginate([])),
    )

    render(<PendingRegistrationsPanel />)

    expect(await screen.findByText("Aucune demande en attente")).toBeInTheDocument()
    expect(screen.getByText("0 en attente")).toBeInTheDocument()
  })

  it("affiche la liste des demandes et permet d'approuver un compte", async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(paginate(sampleUsers)))
      .mockResolvedValueOnce(Response.json({ ...sampleUsers[0], status: "ACTIVE" }))
      .mockResolvedValueOnce(Response.json(paginate([sampleUsers[1]])))

    render(<PendingRegistrationsPanel />)

    expect(await screen.findByText("Alice Dupont")).toBeInTheDocument()
    expect(screen.getByText("bob.martin")).toBeInTheDocument()
    expect(screen.getByText("2 en attente")).toBeInTheDocument()

    const approveButtons = screen.getAllByRole("button", { name: "Approuver" })
    await user.click(approveButtons[0])

    await waitFor(() => {
      expect(screen.queryByText("Alice Dupont")).not.toBeInTheDocument()
    })
    expect(await screen.findByText("1 en attente")).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/users/10/approve",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    )
  })

  it("permet de refuser une demande d'inscription", async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(paginate([sampleUsers[0]])))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json(paginate([])))

    render(<PendingRegistrationsPanel />)

    await screen.findByText("Alice Dupont")
    await user.click(screen.getByRole("button", { name: "Refuser" }))

    await waitFor(() => {
      expect(screen.getByText("Aucune demande en attente")).toBeInTheDocument()
    })
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/users/10/decline",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    )
  })

  it("affiche une alerte claire en cas de refus d'accès (403) puis recharge au clic sur Actualiser", async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
      .mockResolvedValueOnce(Response.json(paginate([sampleUsers[0]])))

    render(<PendingRegistrationsPanel />)

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent(/Accès administrateur requis/i)

    await user.click(screen.getByRole("button", { name: "Actualiser" }))
    expect(await screen.findByText("Alice Dupont")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("recharge la page précédente après le retrait de la dernière demande d'une page", async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(paginate(sampleUsers, 0, 1)))
      .mockResolvedValueOnce(Response.json(paginate(sampleUsers, 1, 1)))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json(paginate([sampleUsers[0]], 1, 1)))
      .mockResolvedValueOnce(Response.json(paginate([sampleUsers[0]], 0, 1)))

    render(<PendingRegistrationsPanel />)
    await user.click(await screen.findByRole("button", { name: "Suivante" }))
    expect(await screen.findByText("bob.martin")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Refuser" }))

    expect(await screen.findByText("Alice Dupont")).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith("/api/users?page=1&status=PENDING", expect.anything())
  })
})
