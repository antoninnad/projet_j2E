export type AccountStatus = "PENDING" | "ACTIVE" | "DISABLED"
export type UserRole = "MEMBER" | "COMPANY_ADMIN"

export interface User {
  id: number
  username: string
  firstName: string
  lastName: string
  email: string
  status: AccountStatus
  role: UserRole
  companyId: number
}

export type SessionUser = User
export type SessionResponse = { authenticated: boolean; user: SessionUser }
export type LoginRequest = { email: string; password: string }
export type RegisterRequest = LoginRequest &
  Pick<User, "username" | "firstName" | "lastName"> & {
    confirmPassword: string
    companyCode: string
  }
export type RegistrationResponse = Pick<User, "id" | "status"> & { message: string }
export type UpdateUserRequest = Partial<Omit<User, "id" | "companyId">>

export type Company = { id: number; name: string; code?: string }
export type CreateCompanyRequest = {
  companyName: string
  companyCode: string
  adminFirstName: string
  adminLastName: string
  adminUsername: string
  adminEmail: string
  adminPassword: string
  adminConfirmPassword: string
}
export type CreateCompanyResponse = {
  company: Company
  admin: User
}
export type Department = { id: number; name: string; companyId: number }
export type CreateDepartmentRequest = { name: string }
export type DepartmentMember = {
  userId: number
  username: string
  firstName: string
  lastName: string
  email: string
  accessLevel: number
}
export type UpsertDepartmentMemberRequest = {
  userId: number
  accessLevel: number
}

export type NodePermissions = {
  view: boolean
  modify: boolean
  delete: boolean
  manage: boolean
  createChild: boolean
}

export type DocumentNode = {
  id: number
  name: string
  kind: "folder" | "file"
  parentId?: number | null
  departmentId: number
  departmentName: string
  minAccessLevel: number
  owner: Pick<User, "id" | "firstName" | "lastName">
  createdAt: string
  updatedAt?: string | null
  version: number
  originalFileName?: string | null
  contentType?: string | null
  size?: number | null
  permissions: NodePermissions
}

export type BreadcrumbItem = Pick<DocumentNode, "id" | "name">
export type NodeDetail = { node: DocumentNode; path: BreadcrumbItem[] }

export type SharingPerson = Pick<User, "id" | "username" | "firstName" | "lastName" | "email">
export type NodeSharingInfo = {
  nodeId: string
  nodeName: string
  departmentName: string
  owner: SharingPerson
  minAccessLevel: number
  parentMinAccessLevel: number
  actorAccessLevel: number
  isCompanyAdmin: boolean
  canManageSharing: boolean
  contributors: SharingPerson[]
}
export type Profile = { id: number; bio: string; profilePictureUrl: string | null }
export type UpdateProfileRequest = Partial<Omit<Profile, "id">>
export type ChangePasswordRequest = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export type PageQuery = {
  page?: number
  size?: number
  sort?: `${string},${"asc" | "desc"}`
  search?: string
}

export type UserQuery = PageQuery & { status?: AccountStatus }

export interface PageMeta {
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

export type Page<T> = { items: T[]; page: PageMeta }
export type ErrorResponse = { code: string; message: string; errors?: Record<string, string> }
