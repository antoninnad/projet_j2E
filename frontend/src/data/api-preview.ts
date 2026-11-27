import { createApi } from "@/lib/api"
import { paginate } from "@/lib/pagination"
import type {
  ActivityCategory,
  ActivityEntry,
  ChangePasswordRequest,
  Company,
  CreateCompanyRequest,
  CreateCompanyResponse,
  CreateDepartmentRequest,
  Department,
  DepartmentMember,
  ErrorResponse,
  NodeSharingInfo,
  Profile,
  SessionResponse,
  SharingPerson,
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

const initialDepartments: Department[] = [
  { id: 1, companyId: 1, name: "Finance" },
  { id: 2, companyId: 1, name: "Ressources humaines" },
]

function toSharingPerson(user: User): SharingPerson {
  return {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  }
}

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
  const departments = new Map<number, Department>(
    initialDepartments.map((dept) => [dept.id, { ...dept }]),
  )
  const memberships = new Map<number, Map<number, number>>([
    [1, new Map<number, number>([[1, 4], [6, 2], [3, 1]])],
    [2, new Map<number, number>([[1, 4], [5, 3], [7, 1]])],
  ])
  const sharingByNode = new Map<string, NodeSharingInfo>([
    [
      "guide",
      {
        nodeId: "guide",
        nodeName: "guide-demarrage.md",
        departmentName: "Finance",
        owner: toSharingPerson(admin),
        minAccessLevel: 1,
        parentMinAccessLevel: 1,
        actorAccessLevel: 4,
        isCompanyAdmin: true,
        canManageSharing: true,
        contributors: [toSharingPerson(initialColleagues[0]), toSharingPerson(initialColleagues[1])],
      },
    ],
    [
      "architecture",
      {
        nodeId: "architecture",
        nodeName: "architecture.md",
        departmentName: "Ressources humaines",
        owner: toSharingPerson(initialColleagues[1]),
        minAccessLevel: 2,
        parentMinAccessLevel: 1,
        actorAccessLevel: 4,
        isCompanyAdmin: true,
        canManageSharing: true,
        contributors: [toSharingPerson(initialColleagues[0])],
      },
    ],
  ])
  let currentPassword = "Password123!"
  let nextActivityId = 9

  const activities: ActivityEntry[] = [
    {
      id: 8,
      action: "FILE_SAVED",
      category: "DOCUMENT",
      label: "a enregistré le fichier",
      occurredAt: "2026-11-27T14:20:00Z",
      actor: { id: 3, firstName: "Léa", lastName: "Dubois" },
      nodeId: 20,
      nodeName: "guide-demarrage.md",
      nodeKind: "file",
      departmentId: 1,
      departmentName: "Finance",
      targetUserId: null,
      targetUserName: null,
      details: "Version 3 enregistrée",
    },
    {
      id: 7,
      action: "CONTRIBUTOR_ADDED",
      category: "RIGHTS",
      label: "a ajouté un contributeur à",
      occurredAt: "2026-11-27T11:45:00Z",
      actor: { id: 1, firstName: "Alice", lastName: "Martin" },
      nodeId: 20,
      nodeName: "guide-demarrage.md",
      nodeKind: "file",
      departmentId: 1,
      departmentName: "Finance",
      targetUserId: 4,
      targetUserName: "Hugo Petit",
      details: null,
    },
    {
      id: 6,
      action: "THRESHOLD_CHANGED",
      category: "RIGHTS",
      label: "a changé le seuil d'accès de",
      occurredAt: "2026-11-26T16:30:00Z",
      actor: { id: 4, firstName: "Hugo", lastName: "Petit" },
      nodeId: 21,
      nodeName: "architecture.md",
      nodeKind: "file",
      departmentId: 2,
      departmentName: "Ressources humaines",
      targetUserId: null,
      targetUserName: null,
      details: "« 1 » → « 2 »",
    },
    {
      id: 5,
      action: "FILE_UPLOADED",
      category: "DOCUMENT",
      label: "a importé le fichier",
      occurredAt: "2026-11-26T10:15:00Z",
      actor: { id: 6, firstName: "Lucas", lastName: "Moreau" },
      nodeId: 22,
      nodeName: "budget-previsionnel-2026.pdf",
      nodeKind: "file",
      departmentId: 1,
      departmentName: "Finance",
      targetUserId: null,
      targetUserName: null,
      details: null,
    },
    {
      id: 4,
      action: "MEMBER_ACCESS_SET",
      category: "ADMINISTRATION",
      label: "a défini le niveau d'accès d'un membre dans",
      occurredAt: "2026-11-25T15:10:00Z",
      actor: { id: 1, firstName: "Alice", lastName: "Martin" },
      nodeId: null,
      nodeName: null,
      nodeKind: null,
      departmentId: 1,
      departmentName: "Finance",
      targetUserId: 6,
      targetUserName: "Lucas Moreau",
      details: "Niveau L = 2",
    },
    {
      id: 3,
      action: "FOLDER_CREATED",
      category: "DOCUMENT",
      label: "a créé le dossier",
      occurredAt: "2026-11-24T09:30:00Z",
      actor: { id: 1, firstName: "Alice", lastName: "Martin" },
      nodeId: 10,
      nodeName: "Archives",
      nodeKind: "folder",
      departmentId: 1,
      departmentName: "Finance",
      targetUserId: null,
      targetUserName: null,
      details: null,
    },
    {
      id: 2,
      action: "ACCOUNT_APPROVED",
      category: "ADMINISTRATION",
      label: "a approuvé l'inscription de",
      occurredAt: "2026-11-23T17:05:00Z",
      actor: { id: 1, firstName: "Alice", lastName: "Martin" },
      nodeId: null,
      nodeName: null,
      nodeKind: null,
      departmentId: null,
      departmentName: null,
      targetUserId: 5,
      targetUserName: "Inès Laurent",
      details: null,
    },
    {
      id: 1,
      action: "DEPARTMENT_CREATED",
      category: "ADMINISTRATION",
      label: "a créé le département",
      occurredAt: "2026-11-22T08:00:00Z",
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

  function recordPreviewActivity(
    entry: Omit<ActivityEntry, "id" | "occurredAt" | "actor"> & { actor?: ActivityEntry["actor"] },
  ) {
    const me = users.get(admin.id) ?? admin
    activities.unshift({
      id: nextActivityId++,
      occurredAt: new Date().toISOString(),
      actor:
        entry.actor !== undefined
          ? entry.actor
          : { id: me.id, firstName: me.firstName, lastName: me.lastName },
      ...entry,
    })
  }

  function recordSharingActivity(
    action: string,
    category: ActivityCategory,
    label: string,
    sharing: NodeSharingInfo,
    extra?: { targetUser?: User; details?: string | null },
  ) {
    const numericId = /^\d+$/.test(sharing.nodeId) ? Number(sharing.nodeId) : null
    recordPreviewActivity({
      action,
      category,
      label,
      nodeId: numericId,
      nodeName: sharing.nodeName,
      nodeKind: "file",
      departmentId: null,
      departmentName: sharing.departmentName,
      targetUserId: extra?.targetUser?.id ?? null,
      targetUserName: extra?.targetUser
        ? `${extra.targetUser.firstName} ${extra.targetUser.lastName}`.trim()
        : null,
      details: extra?.details ?? null,
    })
  }

  function getOrCreateNodeSharing(nodeId: string): NodeSharingInfo {
    const existing = sharingByNode.get(nodeId)
    if (existing) return existing
    const fallback: NodeSharingInfo = {
      nodeId,
      nodeName: nodeId,
      departmentName: "Finance",
      owner: toSharingPerson(admin),
      minAccessLevel: 1,
      parentMinAccessLevel: 0,
      actorAccessLevel: 4,
      isCompanyAdmin: true,
      canManageSharing: true,
      contributors: [],
    }
    sharingByNode.set(nodeId, fallback)
    return fallback
  }

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
        return list(
          [...departments.values()].filter((item) => item.name.toLocaleLowerCase("fr").includes(search)),
          searchParams,
        )
      }

      if (method === "POST" && pathname === "/api/departments") {
        const payload = (typeof body === "string" ? JSON.parse(body) : {}) as Partial<CreateDepartmentRequest>
        const name = (payload.name ?? "").trim()
        if (!name) {
          return error(422, "VALIDATION_FAILED", "Le nom du département est obligatoire.", {
            name: "Le nom du département est obligatoire.",
          })
        }
        const exists = [...departments.values()].some(
          (dept) => dept.name.toLocaleLowerCase("fr") === name.toLocaleLowerCase("fr"),
        )
        if (exists) {
          return error(409, "CONFLICT", "Un département portant ce nom existe déjà.", {
            name: "Ce nom de département est déjà utilisé.",
          })
        }
        const id = Math.max(0, ...departments.keys()) + 1
        const created: Department = { id, companyId: admin.companyId, name }
        departments.set(id, created)
        memberships.set(id, new Map<number, number>([[admin.id, 4]]))
        recordPreviewActivity({
          action: "DEPARTMENT_CREATED",
          category: "ADMINISTRATION",
          label: "a créé le département",
          nodeId: null,
          nodeName: null,
          nodeKind: null,
          departmentId: created.id,
          departmentName: created.name,
          targetUserId: null,
          targetUserName: null,
          details: null,
        })
        return Response.json(created satisfies Department, { status: 201 })
      }

      const deptMembersMatch = /^\/api\/departments\/(\d+)\/members$/.exec(pathname)
      if (method === "GET" && deptMembersMatch) {
        const departmentId = Number(deptMembersMatch[1])
        if (!departments.has(departmentId)) return error(404, "NOT_FOUND", "Département introuvable.")
        const deptMap = memberships.get(departmentId) ?? new Map<number, number>()
        const items: DepartmentMember[] = []
        for (const [userId, accessLevel] of deptMap.entries()) {
          const member = users.get(userId)
          if (member && member.status === "ACTIVE") {
            items.push({
              userId: member.id,
              username: member.username,
              firstName: member.firstName,
              lastName: member.lastName,
              email: member.email,
              accessLevel,
            })
          }
        }
        items.sort((a, b) => b.accessLevel - a.accessLevel || a.lastName.localeCompare(b.lastName, "fr"))
        return Response.json(items satisfies DepartmentMember[])
      }

      const deptMemberItemMatch = /^\/api\/departments\/(\d+)\/members\/(\d+)$/.exec(pathname)
      if (deptMemberItemMatch) {
        const departmentId = Number(deptMemberItemMatch[1])
        const userId = Number(deptMemberItemMatch[2])
        if (!departments.has(departmentId)) return error(404, "NOT_FOUND", "Département introuvable.")
        const member = users.get(userId)
        if (!member || member.companyId !== admin.companyId) {
          return error(404, "NOT_FOUND", "Membre introuvable.")
        }
        const deptMap = memberships.get(departmentId) ?? new Map<number, number>()
        memberships.set(departmentId, deptMap)

        if (method === "PUT") {
          if (member.status !== "ACTIVE") {
            return error(409, "CONFLICT", "Seul un compte actif peut être affecté à un département.")
          }
          const payload = (typeof body === "string" ? JSON.parse(body) : {}) as { accessLevel?: number }
          const accessLevel = Number(payload.accessLevel)
          if (!Number.isInteger(accessLevel) || accessLevel < 0) {
            return error(422, "VALIDATION_FAILED", "Le niveau d'accès doit être un entier positif ou nul.", {
              accessLevel: "Indiquez un entier supérieur ou égal à 0.",
            })
          }
          deptMap.set(userId, accessLevel)
          const dept = departments.get(departmentId)!
          recordPreviewActivity({
            action: "MEMBER_ACCESS_SET",
            category: "ADMINISTRATION",
            label: "a défini le niveau d'accès d'un membre dans",
            nodeId: null,
            nodeName: null,
            nodeKind: null,
            departmentId: dept.id,
            departmentName: dept.name,
            targetUserId: member.id,
            targetUserName: `${member.firstName} ${member.lastName}`.trim(),
            details: `Niveau L = ${accessLevel}`,
          })
          return Response.json({
            userId: member.id,
            username: member.username,
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
            accessLevel,
          } satisfies DepartmentMember)
        }

        if (method === "DELETE") {
          deptMap.delete(userId)
          const dept = departments.get(departmentId)!
          recordPreviewActivity({
            action: "MEMBER_REMOVED",
            category: "ADMINISTRATION",
            label: "a retiré un membre de",
            nodeId: null,
            nodeName: null,
            nodeKind: null,
            departmentId: dept.id,
            departmentName: dept.name,
            targetUserId: member.id,
            targetUserName: `${member.firstName} ${member.lastName}`.trim(),
            details: null,
          })
          return new Response(null, { status: 204 })
        }
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
          const payload = (typeof body === "string" ? JSON.parse(body) : {}) as UpdateUserRequest
          if (payload.status !== undefined) {
            if (id === admin.id && payload.status === "DISABLED") {
              return error(409, "CONFLICT", "Vous ne pouvez pas désactiver votre propre compte administrateur.")
            }
            const updatedStatus: User = { ...target, status: payload.status }
            users.set(id, updatedStatus)
            if (payload.status === "DISABLED") {
              recordPreviewActivity({
                action: "ACCOUNT_DISABLED",
                category: "ADMINISTRATION",
                label: "a désactivé le compte de",
                nodeId: null,
                nodeName: null,
                nodeKind: null,
                departmentId: null,
                departmentName: null,
                targetUserId: target.id,
                targetUserName: `${target.firstName} ${target.lastName}`.trim(),
                details: null,
              })
            }
            return Response.json(updatedStatus satisfies User)
          }
          if (id !== admin.id) {
            return error(403, "FORBIDDEN", "La modification d'un profil est réservée à son propriétaire.")
          }
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
          recordPreviewActivity({
            action: "ACCOUNT_DECLINED",
            category: "ADMINISTRATION",
            label: "a refusé l'inscription de",
            nodeId: null,
            nodeName: null,
            nodeKind: null,
            departmentId: null,
            departmentName: null,
            targetUserId: user.id,
            targetUserName: `${user.firstName} ${user.lastName}`.trim(),
            details: null,
          })
          return new Response(null, { status: 204 })
        }
        const approved = { ...user, status: "ACTIVE" } satisfies User
        users.set(id, approved)
        recordPreviewActivity({
          action: "ACCOUNT_APPROVED",
          category: "ADMINISTRATION",
          label: "a approuvé l'inscription de",
          nodeId: null,
          nodeName: null,
          nodeKind: null,
          departmentId: null,
          departmentName: null,
          targetUserId: approved.id,
          targetUserName: `${approved.firstName} ${approved.lastName}`.trim(),
          details: null,
        })
        return Response.json(approved)
      }

      const sharingMatch = /^\/api\/nodes\/([^/]+)\/sharing$/.exec(pathname)
      if (method === "GET" && sharingMatch) {
        const nodeId = decodeURIComponent(sharingMatch[1])
        return Response.json(getOrCreateNodeSharing(nodeId) satisfies NodeSharingInfo)
      }

      const thresholdMatch = /^\/api\/nodes\/([^/]+)\/threshold$/.exec(pathname)
      if (method === "PATCH" && thresholdMatch) {
        const nodeId = decodeURIComponent(thresholdMatch[1])
        const current = getOrCreateNodeSharing(nodeId)
        if (!current.canManageSharing) {
          return error(403, "FORBIDDEN", "Vous n'avez pas le droit de modifier le seuil d'accès de cet élément.")
        }
        const payload = (typeof body === "string" ? JSON.parse(body) : {}) as { minAccessLevel?: number }
        const minAccessLevel = Number(payload.minAccessLevel)
        if (!Number.isInteger(minAccessLevel) || minAccessLevel < 0) {
          return error(422, "VALIDATION_FAILED", "Le seuil d'accès doit être un entier positif ou nul.")
        }
        if (minAccessLevel < current.parentMinAccessLevel) {
          return error(
            422,
            "VALIDATION_FAILED",
            `Le seuil d'un élément ne peut pas être inférieur à celui de son dossier parent (seuil parent : ${current.parentMinAccessLevel}).`,
          )
        }
        if (!current.isCompanyAdmin && minAccessLevel > current.actorAccessLevel) {
          return error(
            403,
            "FORBIDDEN",
            `Vous ne pouvez pas définir un seuil supérieur à votre propre niveau d'accès (${current.actorAccessLevel}).`,
          )
        }
        const updated: NodeSharingInfo = { ...current, minAccessLevel }
        sharingByNode.set(nodeId, updated)
        recordSharingActivity("THRESHOLD_CHANGED", "RIGHTS", "a changé le seuil d'accès de", updated, {
          details: `« ${current.minAccessLevel} » → « ${minAccessLevel} »`,
        })
        return Response.json(updated satisfies NodeSharingInfo)
      }

      const addContributorMatch = /^\/api\/nodes\/([^/]+)\/contributors$/.exec(pathname)
      if (method === "POST" && addContributorMatch) {
        const nodeId = decodeURIComponent(addContributorMatch[1])
        const current = getOrCreateNodeSharing(nodeId)
        if (!current.canManageSharing) {
          return error(403, "FORBIDDEN", "Vous n'avez pas le droit de gérer les contributeurs de cet élément.")
        }
        const payload = (typeof body === "string" ? JSON.parse(body) : {}) as { userId?: number }
        const candidate = payload.userId ? users.get(Number(payload.userId)) : undefined
        if (!candidate || candidate.companyId !== admin.companyId || candidate.status !== "ACTIVE") {
          return error(404, "NOT_FOUND", "Membre actif introuvable dans votre entreprise.")
        }
        if (candidate.id === current.owner.id) {
          return error(409, "CONFLICT", "Le propriétaire dispose déjà des droits complets sur cet élément.")
        }
        if (current.contributors.some((person) => person.id === candidate.id)) {
          return error(409, "CONFLICT", "Ce membre est déjà contributeur de cet élément.")
        }
        const updated: NodeSharingInfo = {
          ...current,
          contributors: [...current.contributors, toSharingPerson(candidate)],
        }
        sharingByNode.set(nodeId, updated)
        recordSharingActivity("CONTRIBUTOR_ADDED", "RIGHTS", "a ajouté un contributeur à", updated, {
          targetUser: candidate,
        })
        return Response.json(updated satisfies NodeSharingInfo)
      }

      const removeContributorMatch = /^\/api\/nodes\/([^/]+)\/contributors\/(\d+)$/.exec(pathname)
      if (method === "DELETE" && removeContributorMatch) {
        const nodeId = decodeURIComponent(removeContributorMatch[1])
        const userId = Number(removeContributorMatch[2])
        const current = getOrCreateNodeSharing(nodeId)
        if (!current.canManageSharing) {
          return error(403, "FORBIDDEN", "Vous n'avez pas le droit de gérer les contributeurs de cet élément.")
        }
        const removed = users.get(userId)
        const updated: NodeSharingInfo = {
          ...current,
          contributors: current.contributors.filter((person) => person.id !== userId),
        }
        sharingByNode.set(nodeId, updated)
        recordSharingActivity("CONTRIBUTOR_REMOVED", "RIGHTS", "a retiré un contributeur de", updated, {
          targetUser: removed,
        })
        return Response.json(updated satisfies NodeSharingInfo)
      }

      if (method === "GET" && pathname === "/api/activity") {
        const page = Number(searchParams.get("page") ?? 0)
        const size = Number(searchParams.get("size") ?? 20)
        if (!Number.isSafeInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100) {
          return error(400, "BAD_REQUEST", "Les paramètres de pagination sont invalides.")
        }
        const ordered = [...activities].sort(
          (a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || b.id - a.id,
        )
        return Response.json(paginate(ordered, page, size))
      }

      const nodeActivityMatch = /^\/api\/nodes\/(\d+)\/activity$/.exec(pathname)
      if (method === "GET" && nodeActivityMatch) {
        const nodeId = Number(nodeActivityMatch[1])
        const page = Number(searchParams.get("page") ?? 0)
        const size = Number(searchParams.get("size") ?? 20)
        if (!Number.isSafeInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100) {
          return error(400, "BAD_REQUEST", "Les paramètres de pagination sont invalides.")
        }
        const ordered = activities
          .filter((entry) => entry.nodeId === nodeId)
          .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || b.id - a.id)
        return Response.json(paginate(ordered, page, size))
      }

      return error(501, "NOT_IMPLEMENTED", "Cette opération n'est pas disponible dans l'aperçu.")
    },
  })
}
