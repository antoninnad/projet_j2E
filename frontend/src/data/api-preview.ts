import { createApi } from "@/lib/api"
import { paginate } from "@/lib/pagination"
import type {
  ChangePasswordRequest,
  Company,
  CreateCompanyRequest,
  CreateCompanyResponse,
  Department,
  ErrorResponse,
  Profile,
  SessionResponse,
  UpdateProfileRequest,
  UpdateUserRequest,
  User,
} from "@/types/api"

const admin: User = {
  id: 1, companyId: 1, username: "alice.martin", firstName: "Alice", lastName: "Martin",
  email: "alice@example.com", status: "ACTIVE", role: "COMPANY_ADMIN",
}

const pending: User = {
  id: 2, companyId: 1, username: "sam.bernard", firstName: "Sam", lastName: "Bernard",
  email: "sam@example.com", status: "PENDING", role: "MEMBER",
}

const initialColleagues: User[] = [
  {
    id: 3, companyId: 1, username: "lea.dubois", firstName: "Léa", lastName: "Dubois",
    email: "lea.dubois@example.com", status: "ACTIVE", role: "MEMBER",
  },
  {
    id: 4, companyId: 1, username: "hugo.petit", firstName: "Hugo", lastName: "Petit",
    email: "hugo.petit@example.com", status: "ACTIVE", role: "MEMBER",
  },
  {
    id: 5, companyId: 1, username: "ines.laurent", firstName: "Inès", lastName: "Laurent",
    email: "ines.laurent@example.com", status: "ACTIVE", role: "MEMBER",
  },
  {
    id: 6, companyId: 1, username: "lucas.moreau", firstName: "Lucas", lastName: "Moreau",
    email: "lucas.moreau@example.com", status: "ACTIVE", role: "MEMBER",
  },
  {
    id: 7, companyId: 1, username: "camille.roux", firstName: "Camille", lastName: "Roux",
    email: "camille.roux@example.com", status: "ACTIVE", role: "MEMBER",
  },
]

const initialProfiles: Record<number, Profile> = {
  1: {
    id: 1,
    bio: "Administratrice de l'espace CyTech — coordination des départements et des accès.",
    profilePictureUrl: null,
  },
  3: {
    id: 3,
    bio: "Référente design produit et documentation partagée.",
    profilePictureUrl: null,
  },
  4: {
    id: 4,
    bio: "Ingénieur plateforme — département Technique.",
    profilePictureUrl: null,
  },
  5: {
    id: 5,
    bio: "Chargée des ressources humaines et de l'accueil des nouveaux arrivants.",
    profilePictureUrl: null,
  },
  6: {
    id: 6,
    bio: "Analyste financier — département Finance.",
    profilePictureUrl: null,
  },
  7: {
    id: 7,
    bio: "Cheffe de projet opérations internes.",
    profilePictureUrl: null,
  },
}

const departments: Department[] = [
  { id: 1, companyId: 1, name: "Finance" },
  { id: 2, companyId: 1, name: "Ressources humaines" },
]

function error(status: number, code: string, message: string, errors?: Record<string, string>): Response {
  return Response.json({ code, message, ...(errors ? { errors } : {}) } satisfies ErrorResponse, { status })
}

function list<T extends { id: number }>(items: T[], params: URLSearchParams): Response {
  const page = Number(params.get("page") ?? 0)
  const size = Number(params.get("size") ?? 20)
  if (!Number.isSafeInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100) {
    return error(400, "BAD_REQUEST", "Les paramètres de pagination sont invalides.")
  }

  const [field = "id", direction = "asc"] = (params.get("sort") ?? "id,asc").split(",")
  const sorted = [...items].sort((left, right) => {
    const key = Object.hasOwn(left, field) ? field as keyof T : "id"
    const a = left[key]
    const b = right[key]
    const order = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "fr")
    return (direction === "desc" ? -order : order) || left.id - right.id
  })
  return Response.json(paginate(sorted, page, size))
}

export function createPreviewApi() {
  const users = new Map<number, User>([
    [admin.id, { ...admin }],
    [pending.id, { ...pending }],
    ...initialColleagues.map((colleague) => [colleague.id, { ...colleague }] as const),
  ])
  const profiles = new Map<number, Profile>(
    Object.entries(initialProfiles).map(([id, profile]) => [Number(id), { ...profile }]),
  )
  const companies = new Map<number, Company>([[1, { id: 1, name: "CyTech", code: "CYTECH" }]])
  let currentPassword = "Password123!"

  return createApi({
    fetcher: async (url, { method, body, signal }) => {
      signal?.throwIfAborted()
      const { pathname, searchParams } = new URL(url, "http://localhost")
      const search = (searchParams.get("search") ?? "").toLocaleLowerCase("fr")

      if (method === "GET" && pathname === "/api/auth/session") {
        const me = users.get(admin.id)!
        return Response.json({ authenticated: true, user: me } satisfies SessionResponse)
      }

      if (method === "GET" && pathname === "/api/profiles/me") {
        const myProfile = profiles.get(admin.id) ?? { id: admin.id, bio: "", profilePictureUrl: null }
        return Response.json(myProfile satisfies Profile)
      }

      if (method === "PATCH" && pathname === "/api/profiles/me") {
        const payload = (typeof body === "string" ? JSON.parse(body) : {}) as UpdateProfileRequest
        if (payload.bio !== undefined && payload.bio.length > 2000) {
          return error(422, "VALIDATION_FAILED", "La biographie dépasse la limite autorisée.", {
            bio: "La biographie ne doit pas dépasser 2000 caractères.",
          })
        }
        const current = profiles.get(admin.id) ?? { id: admin.id, bio: "", profilePictureUrl: null }
        const updated: Profile = {
          ...current,
          bio: payload.bio !== undefined ? payload.bio : current.bio,
          profilePictureUrl:
            payload.profilePictureUrl !== undefined ? payload.profilePictureUrl : current.profilePictureUrl,
        }
        profiles.set(admin.id, updated)
        return Response.json(updated satisfies Profile)
      }

      if (method === "POST" && pathname === "/api/profiles/me/password") {
        const payload = (typeof body === "string" ? JSON.parse(body) : {}) as Partial<ChangePasswordRequest>
        if (!payload.currentPassword || payload.currentPassword !== currentPassword) {
          return error(422, "VALIDATION_FAILED", "Le mot de passe actuel est incorrect.", {
            currentPassword: "Mot de passe actuel incorrect.",
          })
        }
        if (!payload.newPassword || payload.newPassword.length < 8) {
          return error(422, "VALIDATION_FAILED", "Le nouveau mot de passe est trop court.", {
            newPassword: "Le mot de passe doit contenir au moins 8 caractères.",
          })
        }
        if (payload.newPassword !== payload.confirmPassword) {
          return error(422, "VALIDATION_FAILED", "Les mots de passe ne correspondent pas.", {
            confirmPassword: "La confirmation ne correspond pas au nouveau mot de passe.",
          })
        }
        currentPassword = payload.newPassword
        return new Response(null, { status: 204 })
      }

      if (method === "POST" && pathname === "/api/companies") {
        const payload = (typeof body === "string" ? JSON.parse(body) : {}) as Partial<CreateCompanyRequest>
        const code = (payload.companyCode ?? "").trim().toUpperCase()
        const name = (payload.companyName ?? "").trim()
        if (!name || !code || !payload.adminUsername || !payload.adminEmail || !payload.adminPassword) {
          return error(400, "VALIDATION_FAILED", "Tous les champs de création d'entreprise sont obligatoires.")
        }
        if (payload.adminPassword !== payload.adminConfirmPassword) {
          return error(400, "VALIDATION_FAILED", "Les mots de passe ne correspondent pas.", {
            adminConfirmPassword: "La confirmation ne correspond pas au mot de passe.",
          })
        }
        const codeExists = [...companies.values()].some((c) => c.code?.toUpperCase() === code)
        if (codeExists) {
          return error(409, "CONFLICT", "Ce code d'entreprise est déjà utilisé.", {
            companyCode: "Ce code d'entreprise existe déjà.",
          })
        }
        const companyId = companies.size + 1
        const createdCompany: Company = { id: companyId, name, code }
        companies.set(companyId, createdCompany)
        const adminId = users.size + 1
        const createdAdmin: User = {
          id: adminId,
          companyId,
          username: payload.adminUsername.trim(),
          firstName: (payload.adminFirstName ?? "").trim(),
          lastName: (payload.adminLastName ?? "").trim(),
          email: payload.adminEmail.trim(),
          status: "ACTIVE",
          role: "COMPANY_ADMIN",
        }
        users.set(adminId, createdAdmin)
        return Response.json(
          { company: createdCompany, admin: createdAdmin } satisfies CreateCompanyResponse,
          { status: 201 },
        )
      }

      if (method === "GET" && pathname === "/api/departments") {
        return list(departments.filter((item) => item.name.toLocaleLowerCase("fr").includes(search)), searchParams)
      }

      if (method === "GET" && pathname === "/api/users") {
        const status = searchParams.get("status")
        const matches = [...users.values()].filter(
          (user) =>
            user.companyId === admin.companyId &&
            (!status || user.status === status) &&
            `${user.firstName} ${user.lastName} ${user.username} ${user.email}`.toLocaleLowerCase("fr").includes(search),
        )
        return list(matches, searchParams)
      }

      const userMatch = /^\/api\/users\/(\d+)$/.exec(pathname)
      if (userMatch) {
        const id = Number(userMatch[1])
        const target = users.get(id)
        if (!target || target.companyId !== admin.companyId) {
          return error(404, "NOT_FOUND", "Compte introuvable.")
        }
        if (method === "GET") {
          return Response.json(target satisfies User)
        }
        if (method === "PATCH") {
          if (id !== admin.id) {
            return error(403, "FORBIDDEN", "La modification d'un profil est réservée à son propriétaire.")
          }
          const payload = (typeof body === "string" ? JSON.parse(body) : {}) as UpdateUserRequest
          const firstName = payload.firstName !== undefined ? payload.firstName.trim() : target.firstName
          const lastName = payload.lastName !== undefined ? payload.lastName.trim() : target.lastName
          if (!firstName || !lastName) {
            return error(422, "VALIDATION_FAILED", "Le prénom et le nom sont obligatoires.", {
              ...(!firstName ? { firstName: "Le prénom est obligatoire." } : {}),
              ...(!lastName ? { lastName: "Le nom est obligatoire." } : {}),
            })
          }
          const updated: User = { ...target, firstName, lastName }
          users.set(id, updated)
          return Response.json(updated satisfies User)
        }
      }

      const profileMatch = /^\/api\/users\/(\d+)\/profile$/.exec(pathname)
      if (method === "GET" && profileMatch) {
        const id = Number(profileMatch[1])
        const target = users.get(id)
        if (!target || target.companyId !== admin.companyId || target.status !== "ACTIVE") {
          return error(404, "NOT_FOUND", "Profil introuvable.")
        }
        const colleagueProfile = profiles.get(id) ?? { id, bio: "", profilePictureUrl: null }
        return Response.json(colleagueProfile satisfies Profile)
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
