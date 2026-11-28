import { describe, expect, it, vi } from "vitest"
import { createPreviewApi } from "@/data/api-preview"
import { createApi } from "@/lib/api"
import { paginate } from "@/lib/pagination"

describe("API contract", () => {
  it("encodes the filters and sends the session cookie on the app origin", async () => {
    const empty = paginate([])
    const fetcher = vi.fn().mockResolvedValue(Response.json(empty))
    const api = createApi({ baseUrl: "/lagui/", fetcher })

    await expect(api.listUsers({ page: 0, size: 12, status: "PENDING", search: "Éloïse & Sam" })).resolves.toEqual(empty)
    expect(fetcher).toHaveBeenCalledWith("/lagui/api/users?page=0&size=12&status=PENDING&search=%C3%89lo%C3%AFse+%26+Sam", expect.objectContaining({
      method: "GET", credentials: "same-origin",
    }))
  })

  it("uses the department membership route and request shape from the API contract", async () => {
    const membership = { id: 8, userId: 12, departmentId: 4, accessLevel: 3 }
    const fetcher = vi.fn().mockResolvedValue(Response.json(membership))
    const api = createApi({ fetcher })

    await expect(api.upsertDepartmentMember(4, { userId: 12, accessLevel: 3 })).resolves.toEqual(membership)
    expect(fetcher).toHaveBeenCalledWith("/api/departments/4/members", expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({ userId: 12, accessLevel: 3 }),
    }))
  })

  it("uses the colleagues route for the directory, separate from admin account listings", async () => {
    const colleagues = [{ id: 12, username: "alice", firstName: "Alice", lastName: "Martin" }]
    const fetcher = vi.fn().mockResolvedValue(Response.json(colleagues))
    const api = createApi({ fetcher })

    await expect(api.listColleagues({ page: 0, size: 10 })).resolves.toEqual(paginate(colleagues, 0, 10))
    expect(fetcher).toHaveBeenCalledWith(
      "/api/colleagues",
      expect.objectContaining({ method: "GET" }),
    )
  })

  it("sends JSON credentials with the Spring CSRF header on mutations", async () => {
    const token = document.createElement("meta")
    token.name = "_csrf"
    token.content = "csrf-token"
    const header = document.createElement("meta")
    header.name = "_csrf_header"
    header.content = "X-CSRF-TOKEN"
    document.head.append(token, header)
    try {
      const fetcher = vi.fn().mockResolvedValue(Response.json({ code: "UNAUTHORIZED", message: "Connexion refusée" }, { status: 401 }))
      const login = { email: "alice@example.com", password: "example-password" }
      await expect(createApi({ fetcher }).login(login)).rejects.toMatchObject({ status: 401, code: "UNAUTHORIZED" })
      expect(fetcher).toHaveBeenCalledWith("/api/auth/login", expect.objectContaining({
        method: "POST", body: JSON.stringify(login),
      }))
      const headers = fetcher.mock.calls[0][1].headers as Headers
      expect(headers.get("X-CSRF-TOKEN")).toBe("csrf-token")
      expect(headers.get("Content-Type")).toBe("application/json")
    } finally {
      token.remove()
      header.remove()
    }
  })

  it("keeps field errors and reports HTML and network failures as API errors", async () => {
    const fields = { code: "VALIDATION_FAILED", message: "Profil invalide", errors: { bio: "Texte trop long" } }
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json(fields, { status: 422 }))
      .mockResolvedValueOnce(new Response("<html>Connexion</html>", { headers: { "Content-Type": "text/html" } }))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
    const api = createApi({ fetcher })

    await expect(api.updateMyProfile({ bio: "test" })).rejects.toMatchObject({ status: 422, ...fields })
    await expect(api.getSession()).rejects.toMatchObject({ status: 200, code: "INVALID_RESPONSE" })
    await expect(api.getSession()).rejects.toMatchObject({ status: null, code: "NETWORK_ERROR" })
  })

  it("preserves cancellation and handles empty 204 responses", async () => {
    const controller = new AbortController()
    controller.abort()
    const fetcher = vi.fn()
      .mockRejectedValueOnce(controller.signal.reason)
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    const api = createApi({ fetcher })

    await expect(api.getSession(controller.signal)).rejects.toBe(controller.signal.reason)
    await expect(api.logout()).resolves.toBeUndefined()
  })

  it("runs a simulated approval through the same paginated API", async () => {
    const api = createPreviewApi()
    const query = { status: "PENDING" } as const
    const { items: [pending] } = await api.listUsers(query)

    await expect(api.approveUser(pending.id)).resolves.toMatchObject({ id: pending.id, status: "ACTIVE" })
    await expect(api.listUsers(query)).resolves.toEqual(paginate([]))
    await expect(api.declineUser(pending.id)).rejects.toMatchObject({ status: 409, code: "CONFLICT" })
    const results = await api.listDepartments({ page: 1, size: 1, sort: "name,asc" })
    expect(results.items[0].name).toBe("Ressources humaines")
    expect(results.page).toMatchObject({ page: 1, totalElements: 2, last: true })
  })
})
