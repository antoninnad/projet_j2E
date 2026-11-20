import { createApi } from "@/lib/api"
import { paginate } from "@/lib/pagination"
import type { Department, ErrorResponse, SessionResponse, User } from "@/types/api"

const admin: User = {
  id: 1, companyId: 1, username: "alice.martin", firstName: "Alice", lastName: "Martin",
  email: "alice@example.com", status: "ACTIVE", role: "COMPANY_ADMIN",
}

const pending: User = {
  id: 2, companyId: 1, username: "sam.bernard", firstName: "Sam", lastName: "Bernard",
  email: "sam@example.com", status: "PENDING", role: "MEMBER",
}

const departments: Department[] = [
  { id: 1, companyId: 1, name: "Finance" },
  { id: 2, companyId: 1, name: "Ressources humaines" },
]

function error(status: number, code: string, message: string): Response {
  return Response.json({ code, message } satisfies ErrorResponse, { status })
}

function list<T extends { id: number }>(items: T[], params: URLSearchParams): Response {
  const page = Number(params.get("page") ?? 0)
  const size = Number(params.get("size") ?? 20)
  if (!Number.isSafeInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100) {
    return error(400, "BAD_REQUEST", "Les paramètres de pagination sont invalides.")
  }

  const [field = "id", direction = "asc"] = (params.get("sort") ?? "id,asc").split(",")
  const sorted = items.sort((left, right) => {
    const key = Object.hasOwn(left, field) ? field as keyof T : "id"
    const a = left[key]
    const b = right[key]
    const order = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "fr")
    return (direction === "desc" ? -order : order) || left.id - right.id
  })
  return Response.json(paginate(sorted, page, size))
}

export function createPreviewApi() {
  const users = new Map<number, User>([[admin.id, admin], [pending.id, pending]])

  return createApi({
    fetcher: async (url, { method, signal }) => {
      signal?.throwIfAborted()
      const { pathname, searchParams } = new URL(url, "http://localhost")
      const search = (searchParams.get("search") ?? "").toLocaleLowerCase("fr")

      if (method === "GET" && pathname === "/api/auth/session") {
        return Response.json({ authenticated: true, user: admin } satisfies SessionResponse)
      }
      if (method === "GET" && pathname === "/api/departments") {
        return list(departments.filter(item => item.name.toLocaleLowerCase("fr").includes(search)), searchParams)
      }
      if (method === "GET" && pathname === "/api/users") {
        const status = searchParams.get("status")
        const matches = [...users.values()].filter(user =>
          (!status || user.status === status) &&
          `${user.firstName} ${user.lastName} ${user.username} ${user.email}`.toLocaleLowerCase("fr").includes(search),
        )
        return list(matches, searchParams)
      }

      const action = /^\/api\/users\/(\d+)\/(approve|decline)$/.exec(pathname)
      if (method === "POST" && action) {
        const id = Number(action[1])
        const user = users.get(id)
        if (!user) return error(404, "NOT_FOUND", "Compte introuvable.")
        if (user.status !== "PENDING") return error(409, "CONFLICT", "Ce compte n'est plus en attente.")
        if (action[2] === "decline") {
          users.delete(id)
          return new Response(null, { status: 204 })
        }
        const approved = { ...user, status: "ACTIVE" } satisfies User
        users.set(id, approved)
        return Response.json(approved)
      }
      return error(501, "NOT_IMPLEMENTED", "Cette opération n'est pas disponible dans l'aperçu.")
    },
  })
}
