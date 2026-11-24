import { createApiClient, type ApiClientOptions } from "@/lib/api-client"
import type {
  ChangePasswordRequest,
  Company,
  CreateCompanyRequest,
  CreateCompanyResponse,
  CreateDepartmentRequest,
  Department,
  DepartmentMember,
  LoginRequest,
  NodeSharingInfo,
  Page,
  PageQuery,
  Profile,
  RegisterRequest,
  RegistrationResponse,
  SessionResponse,
  UpdateProfileRequest,
  UpdateUserRequest,
  UpsertDepartmentMemberRequest,
  User,
  UserQuery,
} from "@/types/api"

export function createApi(options?: ApiClientOptions) {
  const { json, noContent } = createApiClient(options)

  return {
    register: (data: RegisterRequest, signal?: AbortSignal) =>
      json<RegistrationResponse>("/auth/register", { method: "POST", json: data, signal }),
    login: (data: LoginRequest, signal?: AbortSignal) =>
      json<SessionResponse>("/auth/login", { method: "POST", json: data, signal }),
    logout: (signal?: AbortSignal) => noContent("/auth/logout", { method: "POST", signal }),
    getSession: (signal?: AbortSignal) => json<SessionResponse>("/auth/session", { signal }),
    createCompany: (data: CreateCompanyRequest, signal?: AbortSignal) =>
      json<CreateCompanyResponse>("/companies", { method: "POST", json: data, signal }),
    getCompany: (id: number, signal?: AbortSignal) => json<Company>(`/companies/${id}`, { signal }),
    listUsers: (query?: UserQuery, signal?: AbortSignal) => json<Page<User>>("/users", { query, signal }),
    getUser: (id: number, signal?: AbortSignal) => json<User>(`/users/${id}`, { signal }),
    updateUser: (id: number, data: UpdateUserRequest, signal?: AbortSignal) =>
      json<User>(`/users/${id}`, { method: "PATCH", json: data, signal }),
    approveUser: (id: number, signal?: AbortSignal) => json<User>(`/users/${id}/approve`, { method: "POST", signal }),
    declineUser: (id: number, signal?: AbortSignal) => noContent(`/users/${id}/decline`, { method: "POST", signal }),
    getMyProfile: (signal?: AbortSignal) => json<Profile>("/profiles/me", { signal }),
    updateMyProfile: (data: UpdateProfileRequest, signal?: AbortSignal) =>
      json<Profile>("/profiles/me", { method: "PATCH", json: data, signal }),
    changeMyPassword: (data: ChangePasswordRequest, signal?: AbortSignal) =>
      noContent("/profiles/me/password", { method: "POST", json: data, signal }),
    getUserProfile: (id: number, signal?: AbortSignal) =>
      json<Profile>(`/users/${id}/profile`, { signal }),
    listDepartments: (query?: PageQuery, signal?: AbortSignal) =>
      json<Page<Department>>("/departments", { query, signal }),
    createDepartment: (data: CreateDepartmentRequest, signal?: AbortSignal) =>
      json<Department>("/departments", { method: "POST", json: data, signal }),
    listDepartmentMembers: (departmentId: number, signal?: AbortSignal) =>
      json<DepartmentMember[]>(`/departments/${departmentId}/members`, { signal }),
    upsertDepartmentMember: (
      departmentId: number,
      data: UpsertDepartmentMemberRequest,
      signal?: AbortSignal,
    ) =>
      json<DepartmentMember>(`/departments/${departmentId}/members/${data.userId}`, {
        method: "PUT",
        json: { accessLevel: data.accessLevel },
        signal,
      }),
    removeDepartmentMember: (departmentId: number, userId: number, signal?: AbortSignal) =>
      noContent(`/departments/${departmentId}/members/${userId}`, { method: "DELETE", signal }),
    getNodeSharing: (nodeId: string, signal?: AbortSignal) =>
      json<NodeSharingInfo>(`/nodes/${encodeURIComponent(nodeId)}/sharing`, { signal }),
    updateNodeThreshold: (nodeId: string, minAccessLevel: number, signal?: AbortSignal) =>
      json<NodeSharingInfo>(`/nodes/${encodeURIComponent(nodeId)}/threshold`, {
        method: "PATCH",
        json: { minAccessLevel },
        signal,
      }),
    addNodeContributor: (nodeId: string, userId: number, signal?: AbortSignal) =>
      json<NodeSharingInfo>(`/nodes/${encodeURIComponent(nodeId)}/contributors`, {
        method: "POST",
        json: { userId },
        signal,
      }),
    removeNodeContributor: (nodeId: string, userId: number, signal?: AbortSignal) =>
      json<NodeSharingInfo>(`/nodes/${encodeURIComponent(nodeId)}/contributors/${userId}`, {
        method: "DELETE",
        signal,
      }),
  }
}

export const api = createApi()
export type Api = ReturnType<typeof createApi>
