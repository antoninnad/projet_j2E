import { describe, expect, it, vi } from "vitest"
import { createApi } from "@/lib/api"
import { paginate } from "@/lib/pagination"
import { createSessionAwareFetcher, expiredLoginUrl } from "@/lib/session"

const unauthorized = () =>
  Response.json({ code: "UNAUTHORIZED", message: "Session expirée" }, { status: 401 })

describe("createSessionAwareFetcher (expiration de session)", () => {
  it("construit l'URL de connexion avec le message d'expiration", () => {
    expect(expiredLoginUrl()).toBe("/login?expired=true")
    expect(expiredLoginUrl("/lagui/")).toBe("/lagui/login?expired=true")
  })

  it("redirige vers /login?expired=true quand une route protégée renvoie 401", async () => {
    const navigate = vi.fn()
    const fetcher = createSessionAwareFetcher({ fetcher: vi.fn().mockResolvedValue(unauthorized()), navigate })

    await expect(createApi({ fetcher }).listUsers()).rejects.toMatchObject({ status: 401 })
    expect(navigate).toHaveBeenCalledWith("/login?expired=true")
  })

  it("utilise l'URL fournie par le template Thymeleaf et ne redirige qu'une seule fois", async () => {
    const navigate = vi.fn()
    const fetcher = createSessionAwareFetcher({
      loginUrl: "/app/login?expired=true",
      fetcher: vi.fn().mockImplementation(async () => unauthorized()),
      navigate,
    })
    const client = createApi({ fetcher })

    await expect(client.listUsers()).rejects.toBeDefined()
    await expect(client.listDepartments()).rejects.toBeDefined()
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(navigate).toHaveBeenCalledWith("/app/login?expired=true")
  })

  it("ne redirige pas pour un échec de connexion (401 sur /api/auth/login)", async () => {
    const navigate = vi.fn()
    const fetcher = createSessionAwareFetcher({ fetcher: vi.fn().mockResolvedValue(unauthorized()), navigate })

    await expect(createApi({ fetcher }).login({ email: "a@b.fr", password: "x" })).rejects.toMatchObject({ status: 401 })
    expect(navigate).not.toHaveBeenCalled()
  })

  it("laisse passer les autres réponses sans redirection (200, 403)", async () => {
    const navigate = vi.fn()
    const inner = vi.fn()
      .mockResolvedValueOnce(Response.json(paginate([])))
      .mockResolvedValueOnce(Response.json({ code: "FORBIDDEN", message: "Interdit" }, { status: 403 }))
    const client = createApi({ fetcher: createSessionAwareFetcher({ fetcher: inner, navigate }) })

    await client.listUsers()
    await expect(client.listUsers()).rejects.toMatchObject({ status: 403 })
    expect(navigate).not.toHaveBeenCalled()
  })
})
