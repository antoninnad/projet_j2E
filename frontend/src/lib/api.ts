import { createApiClient, type ApiClientOptions } from "@/lib/api-client"
import { paginate } from "@/lib/pagination"
import type { UploadProgress } from "@/lib/upload-request"
import type {
  ChangePasswordRequest,
  Colleague,
  Company,
  CreateCompanyRequest,
  CreateCompanyResponse,
  CreateDepartmentRequest,
  Department,
  DepartmentMember,
  DocumentNode,
  LoginRequest,
  NodeDetail,
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
  const { request, json, noContent, url } = createApiClient(options)

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
    listColleagues: async (query: Pick<PageQuery, "page" | "size" | "search">, signal?: AbortSignal) => {
      const result = await json<Page<Colleague> | Colleague[]>("/users", {
        query: { ...query, status: "ACTIVE" },
        signal,
      })
      return Array.isArray(result) ? paginate(result, query.page, query.size) : result
    },
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
    listRootFolders: (signal?: AbortSignal) => json<DocumentNode[]>("/folders/roots", { signal }),
    listFolderChildren: (id: number, query?: Pick<PageQuery, "page" | "size">, signal?: AbortSignal) =>
      json<Page<DocumentNode>>(`/folders/${id}/children`, { query, signal }),
    getNode: (id: number, signal?: AbortSignal) => json<NodeDetail>(`/nodes/${id}`, { signal }),
    getFileContent: (id: number, signal?: AbortSignal) => request(`/files/${id}/content`, { signal }),
    fileDownloadUrl: (id: number) => url(`/files/${id}/download`),
    createFolder: (parentId: number, name: string) =>
      json<DocumentNode>("/folders", { method: "POST", json: { parentId, name } }),
    renameFolder: (id: number, name: string, version: number) =>
      json<DocumentNode>(`/folders/${id}`, { method: "PATCH", json: { name, version } }),
    moveNode: (id: number, targetFolderId: number, version: number) =>
      json<DocumentNode>(`/nodes/${id}/move`, { method: "POST", json: { targetFolderId, version } }),
    deleteFolder: (id: number, version: number) =>
      noContent(`/folders/${id}`, { method: "DELETE", query: { version } }),
    uploadFile: (folderId: number, file: File, onProgress: UploadProgress, signal?: AbortSignal) => {
      const body = new FormData()
      body.set("file", file)
      return json<DocumentNode>(`/folders/${folderId}/files`, {
        method: "POST", body, onProgress, signal,
      })
    },
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
